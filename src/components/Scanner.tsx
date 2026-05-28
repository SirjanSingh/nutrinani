"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScanBarcode, Loader2, AlertTriangle, Camera, PlayCircle, StopCircle, FileText, User, Trash2, History, Search, SwitchCamera, Package, Plus, Check } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProfile } from "@/contexts/ProfileContext"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/hooks/use-toast"
import { useAddPantryItem } from "@/hooks/useApi"
import { chatJSON, fileToDataURL, OPENAI_MODELS } from "@/lib/openai"

/* ================= CONFIG ================= */
const SCANNER_API = "https://ubav5knsp8.execute-api.ap-south-1.amazonaws.com"  // ap-south-1
const RECIPE_API = "https://tfn02c762l.execute-api.ap-southeast-2.amazonaws.com"  // ap-southeast-2
const STORAGE_KEY = "scan_history"

/* ================= ZXING READER ================= */
const codeReader = new BrowserMultiFormatReader()

/* ================= TESSERACT LOADER (legacy — kept as a fallback) ================= */
declare global {
  interface Window {
    Tesseract: any
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const loadTesseract = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve(window.Tesseract)
      return
    }

    const script = document.createElement("script")
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract)
      } else {
        reject(new Error("Tesseract failed to load"))
      }
    }
    script.onerror = () => reject(new Error("Failed to load Tesseract script"))
    document.head.appendChild(script)
  })
}

/* ================= STORAGE UTILITIES ================= */
const getScanHistory = (): any[] => {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch (err) {
    console.error("Error reading scan history:", err)
    return []
  }
}

const saveScanToHistory = (scanData: any) => {
  if (typeof window === "undefined") return
  try {
    const history = getScanHistory()
    const newScan = {
      ...scanData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    }
    history.unshift(newScan)
    // Keep only last 50 scans
    const limited = history.slice(0, 50)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limited))
    return newScan
  } catch (err) {
    console.error("Error saving scan:", err)
  }
}

const clearScanHistory = () => {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error("Error clearing history:", err)
  }
}

export const Scanner = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const addPantryItem = useAddPantryItem()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ocrFileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const isScannedRef = useRef(false)
  const scanAttemptsRef = useRef(0)
  const processingFrameRef = useRef(false)
  const ocrWorkerRef = useRef<any>(null)
  const isMountedRef = useRef(true)

  const [cameraOn, setCameraOn] = useState(false)
  const [continuousScanning, setContinuousScanning] = useState(false)
  const [ocrCameraMode, setOcrCameraMode] = useState(false)
  const [barcode, setBarcode] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [scanAttempts, setScanAttempts] = useState(0)
  const [manualBarcode, setManualBarcode] = useState("")
  const [ocrProcessing, setOcrProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [processingStep, setProcessingStep] = useState("")
  const [warnings, setWarnings] = useState<string[]>([])
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)

  /* Camera selection (esp. mobile rear vs selfie) */
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("")

  /* Product database search (before scanning) */
  const [searchQuery, setSearchQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchPerformed, setSearchPerformed] = useState(false)

  /* "Add to Inventory" UI state */
  const [addedToInventory, setAddedToInventory] = useState(false)
  const [inventoryForm, setInventoryForm] = useState({
    quantity: "1",
    unit: "pc",
    category: "Other",
    expiryDate: "",
  })
  const [showInventoryForm, setShowInventoryForm] = useState(false)

  /* ================= LOAD HISTORY ON MOUNT ================= */
  useEffect(() => {
    const history = getScanHistory()
    setScanHistory(history)
  }, [])

  /* ================= ENUMERATE CAMERAS ================= */
  const refreshVideoDevices = async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter((d) => d.kind === "videoinput")
      setVideoDevices(cams)
      // Prefer a back/environment-facing camera by label when no selection yet.
      if (!selectedDeviceId && cams.length > 0) {
        const rear = cams.find((d) => /back|rear|environment/i.test(d.label))
        setSelectedDeviceId((rear || cams[cams.length - 1]).deviceId)
      }
    } catch (err) {
      console.error("enumerateDevices failed:", err)
    }
  }

  useEffect(() => {
    refreshVideoDevices()
    const handler = () => refreshVideoDevices()
    navigator.mediaDevices?.addEventListener?.("devicechange", handler)
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ================= CHECK FOR ALLERGENS, DISLIKES & DISEASES ================= */
  const checkIngredients = (ingredients_en: string[], ingredients_hi: string[]) => {
    if (!profile) return []

    const allIngredients = [...ingredients_en, ...ingredients_hi].map((ing) => ing.toLowerCase())
    // Word-boundary match avoids false positives like "nut" matching "nutmeg" or "egg" matching "eggplant".
    const matchTerm = (term: string) => {
      const escaped = term.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const re = new RegExp(`\\b${escaped}\\b`, "i")
      return allIngredients.some((ing) => re.test(ing))
    }
    const foundWarnings: string[] = []

    if (profile.allergies && Array.isArray(profile.allergies) && profile.allergies.length > 0) {
      profile.allergies.forEach((allergen: string) => {
        if (matchTerm(allergen)) {
          foundWarnings.push(`🚨 ALLERGY ALERT: Contains ${allergen}`)
        }
      })
    }

    if (profile.disliked_foods && Array.isArray(profile.disliked_foods) && profile.disliked_foods.length > 0) {
      profile.disliked_foods.forEach((dislike: string) => {
        if (matchTerm(dislike)) {
          foundWarnings.push(`❌ DISLIKE: Contains ${dislike}`)
        }
      })
    }

    if (profile.diseases && Array.isArray(profile.diseases) && profile.diseases.length > 0) {
      const diseaseWarnings = new Set<string>()

      profile.diseases.forEach((disease: string) => {
        const diseaseLower = disease.toLowerCase()

        if (diseaseLower.includes('diabetes')) {
          const sugarTerms = ['sugar', 'glucose', 'fructose', 'sucrose', 'corn syrup', 'honey', 'molasses', 'dextrose']
          if (sugarTerms.some(matchTerm)) {
            diseaseWarnings.add(`⚕️ DIABETES WARNING: Contains high sugar ingredients`)
          }
        }

        if (diseaseLower.includes('hypertension') || diseaseLower.includes('high bp')) {
          const saltTerms = ['salt', 'sodium', 'monosodium glutamate', 'msg', 'sodium chloride']
          if (saltTerms.some(matchTerm)) {
            diseaseWarnings.add(`⚕️ HYPERTENSION WARNING: Contains high sodium/salt`)
          }
        }

        if (diseaseLower.includes('heart')) {
          const fatTerms = ['palm oil', 'hydrogenated', 'trans fat', 'saturated fat', 'lard', 'butter']
          if (fatTerms.some(matchTerm)) {
            diseaseWarnings.add(`⚕️ HEART HEALTH WARNING: Contains unhealthy fats`)
          }
        }

        if (diseaseLower.includes('celiac')) {
          const glutenTerms = ['wheat', 'gluten', 'barley', 'rye', 'malt', 'semolina', 'durum']
          if (glutenTerms.some(matchTerm)) {
            diseaseWarnings.add(`⚕️ CELIAC WARNING: Contains gluten`)
          }
        }

        if (diseaseLower.includes('fatty liver')) {
          const fattyLiverTerms = ['palm oil', 'hydrogenated', 'trans fat', 'high fructose corn syrup']
          if (fattyLiverTerms.some(matchTerm)) {
            diseaseWarnings.add(`⚕️ FATTY LIVER WARNING: Contains ingredients to avoid`)
          }
        }

        if (diseaseLower.includes('gout')) {
          const purinTerms = ['yeast extract', 'meat extract', 'anchovies', 'sardines']
          if (purinTerms.some(matchTerm)) {
            diseaseWarnings.add(`⚕️ GOUT WARNING: Contains high-purine ingredients`)
          }
        }
      })

      foundWarnings.push(...diseaseWarnings)
    }

    if (profile.other_restrictions && typeof profile.other_restrictions === 'string') {
      const restrictionsList = profile.other_restrictions
        .split(',')
        .map((r: string) => r.trim())
        .filter((r: string) => r.length > 2)

      restrictionsList.forEach((restriction: string) => {
        if (matchTerm(restriction)) {
          foundWarnings.push(`⚠️ RESTRICTION: Contains ${restriction}`)
        }
      })
    }

    return Array.from(new Set(foundWarnings))
  }

  /* ================= MANUAL BARCODE ENTRY ================= */
  const handleManualSubmit = async () => {
    const trimmed = manualBarcode.trim()
    if (!trimmed) {
      toast({ title: "Please enter a barcode", variant: "destructive" })
      return
    }

    if (trimmed.length < 8 || trimmed.length > 14) {
      toast({ title: "Invalid barcode", description: "Barcode should be 8-14 digits", variant: "destructive" })
      return
    }

    console.log("✍️ Manual barcode entry:", trimmed)

    setBarcode(trimmed)
    setManualBarcode("")
    await fetchScanResult(trimmed)
  }

  /* ================= PRODUCT DATABASE SEARCH (via OpenAI) ================= */
  const searchProducts = async () => {
    const q = searchQuery.trim()
    if (!q) {
      toast({ title: "Enter a product name to search", variant: "destructive" })
      return
    }
    setSearching(true)
    setSearchResults([])
    setSearchPerformed(false)
    try {
      const data = await chatJSON<{
        products: Array<{
          name: string
          brand?: string
          barcode?: string
          ingredients_en?: string[]
          ingredients_hi?: string[]
        }>
      }>({
        model: OPENAI_MODELS.text,
        messages: [
          {
            role: "system",
            content:
              "You are a packaged-food lookup helper. Given a product query, return up to 6 likely real products sold in India and globally. " +
              "Respond with JSON only matching: " +
              `{"products":[{"name":string,"brand":string,"barcode":string,"ingredients_en":string[],"ingredients_hi":string[]}]}.` +
              " Use empty string or empty arrays when unsure. Prefer common Indian SKUs when relevant.",
          },
          {
            role: "user",
            content: `Find products matching: "${q}". Return JSON only.`,
          },
        ],
        temperature: 0.2,
      })

      const hits = (data?.products || [])
        .filter((p) => p?.name)
        .map((p) => ({
          // Reuse the shape the UI already renders for OFF results.
          code: p.barcode || `ai-${Math.random().toString(36).slice(2, 10)}`,
          product_name: p.name,
          brands: p.brand,
          image_small_url: "",
          ingredients_en: p.ingredients_en || [],
          ingredients_hi: p.ingredients_hi || [],
          ai_source: true,
        }))

      setSearchResults(hits)
      setSearchPerformed(true)
      if (hits.length === 0) {
        toast({
          title: "No matches",
          description: "Try OCR on the back of the packaging.",
        })
      }
    } catch (err: any) {
      console.error("Search error:", err)
      toast({
        title: "Search failed",
        description: err?.message || "Could not reach the model.",
        variant: "destructive",
      })
    } finally {
      setSearching(false)
    }
  }

  const pickSearchResult = async (hit: any) => {
    if (!hit) return
    setSearchResults([])
    setSearchPerformed(false)
    setSearchQuery("")

    // AI results carry their own ingredients — render directly so we skip the
    // barcode-lookup roundtrip. Real barcodes fall through to fetchScanResult.
    if (hit.ai_source) {
      const ingredients_en: string[] = hit.ingredients_en || []
      const ingredients_hi: string[] = hit.ingredients_hi || []
      const foundWarnings = checkIngredients(ingredients_en, ingredients_hi)
      setWarnings(foundWarnings)
      setBarcode(hit.code?.startsWith("ai-") ? null : hit.code)
      const resultData = {
        name: hit.product_name + (hit.brands ? ` (${hit.brands})` : ""),
        ingredients_en,
        ingredients_hi,
        rawIngredientsText: "",
        source: "ai",
        barcode: hit.code?.startsWith("ai-") ? undefined : hit.code,
        verdict: {
          description: `🤖 AI lookup. ${ingredients_en.length + ingredients_hi.length} ingredients listed. Please verify against the packaging.`,
          riskScore: foundWarnings.length > 0 ? 80 : 0,
        },
      }
      setResult(resultData)
      setAddedToInventory(false)
      setShowInventoryForm(false)
      saveScanToHistory(resultData)
      setScanHistory(getScanHistory())
      return
    }

    setBarcode(hit.code)
    await fetchScanResult(hit.code)
  }

  /* ================= CAMERA ================= */
  const buildVideoConstraints = (): MediaTrackConstraints => {
    const base: MediaTrackConstraints = {
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
    }
    if (selectedDeviceId) {
      return { ...base, deviceId: { exact: selectedDeviceId } }
    }
    return { ...base, facingMode: "environment" }
  }

  const startCamera = async () => {
    // Guard against opening a second stream when one is already active.
    if (streamRef.current) {
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: buildVideoConstraints(),
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraOn(true)
        console.log("✅ Camera started")
        // Labels are only populated after the user grants permission, so
        // re-enumerate now to get readable names in the dropdown.
        refreshVideoDevices()
      } else {
        stream.getTracks().forEach((t) => t.stop())
      }
    } catch (err) {
      console.error("❌ Camera error:", err)
      toast({
        title: "Camera unavailable",
        description: "Cannot access camera. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const switchCamera = async (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    if (!cameraOn) return
    // Tear down the current stream and reopen with the new device.
    const wasContinuous = continuousScanning
    const wasOcrMode = ocrCameraMode
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          deviceId: { exact: deviceId },
        },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
      }
      // Resume the prior mode.
      if (wasContinuous) {
        isScannedRef.current = false
        processingFrameRef.current = false
        scanAttemptsRef.current = 0
        setScanAttempts(0)
        scanIntervalRef.current = window.setInterval(() => {
          if (isScannedRef.current || processingFrameRef.current) return
          scanFrame()
        }, 500)
      }
      if (!wasOcrMode && !wasContinuous) {
        // nothing extra
      }
    } catch (err) {
      console.error("Switch camera failed:", err)
      toast({ title: "Could not switch camera", variant: "destructive" })
      setCameraOn(false)
    }
  }

  const stopCamera = () => {
    stopContinuousScan()
    setOcrCameraMode(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraOn(false)
    console.log("🛑 Camera stopped")
  }

  const startOCRCameraMode = async () => {
    await startCamera()
    setOcrCameraMode(true)
    setContinuousScanning(false)
  }

  /* ================= CONTINUOUS SCANNING ================= */
  const startContinuousScan = () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({ title: "Camera not ready", variant: "destructive" })
      return
    }

    setContinuousScanning(true)
    isScannedRef.current = false
    processingFrameRef.current = false
    scanAttemptsRef.current = 0
    setBarcode(null)
    setResult(null)
    setScanAttempts(0)

    console.log("🔄 Starting continuous scan mode...")

    scanIntervalRef.current = window.setInterval(() => {
      // Skip ticks while a previous frame is still processing or we already succeeded.
      if (isScannedRef.current || processingFrameRef.current) return
      scanFrame()
    }, 500)
  }

  const stopContinuousScan = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    setContinuousScanning(false)
    console.log("⏹️ Stopped continuous scanning")
  }

  const scanFrame = async () => {
    if (!videoRef.current || !canvasRef.current || isScannedRef.current) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    const context = canvas.getContext("2d")
    if (!context) return

    processingFrameRef.current = true
    let imageUrl: string | null = null
    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      scanAttemptsRef.current += 1
      setScanAttempts(scanAttemptsRef.current)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error("Failed to create blob"))
        }, "image/png")
      })

      imageUrl = URL.createObjectURL(blob)

      try {
        const result = await codeReader.decodeFromImageUrl(imageUrl)
        const code = result.getText()

        console.log("✅ BARCODE DETECTED:", code)

        isScannedRef.current = true
        stopContinuousScan()
        setBarcode(code)
        playBeep()
        await fetchScanResult(code)
      } catch (decodeErr) {
        // Read the counter from the ref, not the stale React state.
        if (scanAttemptsRef.current >= 20) {
          console.log("⚠️ No barcode after 20 attempts - triggering OCR fallback")
          isScannedRef.current = true
          stopContinuousScan()

          const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
          playBeep()
          await handleOCRUpload(file)
        }
      }
    } catch (err) {
      console.error("Frame scan error:", err)
    } finally {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
      processingFrameRef.current = false
    }
  }

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    } catch (err) {
      // Ignore audio errors
    }
  }

  /* ================= OCR (via GPT-4o-mini vision) ================= */
  const performOCR = async (imageFile: File) => {
    setOcrProcessing(true)
    setOcrProgress(0)
    setProcessingStep("Sending image to the model...")

    try {
      const dataUrl = await fileToDataURL(imageFile)
      setOcrProgress(40)
      setProcessingStep("Extracting ingredients...")

      const data = await chatJSON<{
        ingredients_en: string[]
        ingredients_hi: string[]
        raw_text: string
      }>({
        model: OPENAI_MODELS.visionText,
        messages: [
          {
            role: "system",
            content:
              "You read the back of food packaging and extract the ingredients list. " +
              `Reply with JSON only: {"ingredients_en":string[],"ingredients_hi":string[],"raw_text":string}.` +
              " ingredients_en is the list in English (translate or transliterate from Hindi if needed). " +
              " ingredients_hi keeps the Hindi/Devanagari items as-is. " +
              " raw_text is the full ingredients line(s) you read, verbatim. " +
              " Each list item should be a single ingredient (no percentages or sub-clauses). " +
              " If no ingredients list is visible, return empty arrays and an empty raw_text.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the ingredients list. Return JSON only." },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
        temperature: 0.1,
        maxTokens: 800,
      })

      setOcrProgress(100)
      setOcrProcessing(false)
      setProcessingStep("")
      setOcrProgress(0)

      return {
        ingredients_en: Array.isArray(data?.ingredients_en) ? data.ingredients_en : [],
        ingredients_hi: Array.isArray(data?.ingredients_hi) ? data.ingredients_hi : [],
        rawText: typeof data?.raw_text === "string" ? data.raw_text : "",
      }
    } catch (err) {
      console.error("❌ OCR Error:", err)
      setOcrProcessing(false)
      setProcessingStep("")
      setOcrProgress(0)
      throw err
    }
  }

  /* ================= IMAGE PREPROCESSING ================= */
  const preprocessImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image()
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const url = URL.createObjectURL(file)

      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(file)
        return
      }

      const cleanup = () => URL.revokeObjectURL(url)

      img.onload = () => {
        // Cap upscale so very large source images don't allocate huge canvases.
        const MAX_SIDE = 3000
        const scale = Math.min(3, MAX_SIDE / Math.max(img.width, img.height, 1))
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Pass 1: grayscale.
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        // Pass 2: contrast stretch before binarisation (previously this was a no-op
        // because it ran after thresholding to 0/255).
        const contrast = 60
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
        }

        // Pass 3: binarise with mean threshold (more robust than a fixed 128
        // on photos with uneven lighting).
        let sum = 0
        for (let i = 0; i < data.length; i += 4) sum += data[i]
        const mean = sum / (data.length / 4)
        const threshold = Math.max(96, Math.min(180, mean))
        for (let i = 0; i < data.length; i += 4) {
          const value = data[i] > threshold ? 255 : 0
          data[i] = value
          data[i + 1] = value
          data[i + 2] = value
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          cleanup()
          resolve(blob || file)
        }, "image/png")
      }

      img.onerror = () => {
        cleanup()
        resolve(file)
      }
      img.src = url
    })
  }

  /* ================= INGREDIENT EXTRACTION ================= */
  const extractIngredients = (text: string) => {
    const cleaned = text.replace(/\n/g, " ").replace(/\s+/g, " ").replace(/\r/g, " ").trim()

    console.log("🔍 Full OCR text:", cleaned)

    const keywordPatterns = [/ingredients?[\s:]+/i, /सामग्री[\s:]+/i, /contains?[\s:]+/i]

    let startIdx = -1
    let matchedKeyword = ""

    for (const pattern of keywordPatterns) {
      const match = cleaned.search(pattern)
      if (match !== -1) {
        startIdx = match
        matchedKeyword = cleaned.match(pattern)?.[0] || ""
        console.log("✅ Found keyword at index:", startIdx, "Keyword:", matchedKeyword)
        break
      }
    }

    if (startIdx === -1) {
      console.log("❌ No ingredient keyword found")
      return {
        ingredients_en: [],
        ingredients_hi: [],
        rawText: cleaned.substring(0, 300),
      }
    }

    const afterKeyword = cleaned.substring(startIdx + matchedKeyword.length)
    console.log("📝 Text after keyword:", afterKeyword.substring(0, 200))

    const stopPatterns = [
      /allergen/i,
      /nutrition/i,
      /nutritional/i,
      /storage/i,
      /serving/i,
      /net weight/i,
      /best before/i,
      /manufactured/i,
      /पोषण/i,
    ]

    let endIdx = afterKeyword.length

    for (const pattern of stopPatterns) {
      const match = afterKeyword.search(pattern)
      if (match !== -1 && match < endIdx) {
        endIdx = match
      }
    }

    const ingredientText = afterKeyword.substring(0, endIdx).trim()
    console.log("🎯 Ingredient section:", ingredientText)

    if (!ingredientText || ingredientText.length < 5) {
      return {
        ingredients_en: [],
        ingredients_hi: [],
        rawText: afterKeyword.substring(0, 300),
      }
    }

    const items = ingredientText
      .split(/[,،;।]+/)
      .map((item) => item.trim())
      .filter((item) => {
        if (item.length < 2 || item.length > 100) return false
        if (/^[0-9%.\s]+$/.test(item)) return false
        return /[a-zA-Z\u0900-\u097F]/.test(item)
      })
      .slice(0, 50)

    console.log("📋 Split items:", items)

    const ingredients_en: string[] = []
    const ingredients_hi: string[] = []

    items.forEach((item) => {
      if (/[\u0900-\u097F]/.test(item)) {
        ingredients_hi.push(item)
      } else if (/[a-zA-Z]{2,}/.test(item)) {
        const cleaned_item = item.replace(/[|]/g, "I").replace(/[0]/g, "O").trim()
        ingredients_en.push(cleaned_item)
      }
    })

    console.log("✅ Final extraction:", {
      en: ingredients_en.length,
      hi: ingredients_hi.length,
      en_items: ingredients_en,
      hi_items: ingredients_hi,
    })

    return {
      ingredients_en,
      ingredients_hi,
      rawText: ingredientText,
    }
  }

  /* ================= UPLOAD & SCAN FROM FILE ================= */
  const scanFromFile = async (file: File) => {
    setBarcode(null)
    setResult(null)

    const imageUrl = URL.createObjectURL(file)
    try {
      console.log("🔍 Scanning uploaded image for barcode...")
      const result = await codeReader.decodeFromImageUrl(imageUrl)

      const code = result.getText()
      console.log("✅ Barcode found in image:", code)

      setBarcode(code)
      await fetchScanResult(code)
    } catch (err) {
      console.error("❌ No barcode in image:", err)
      toast({
        title: "No barcode detected",
        description: "Try a clearer photo, better lighting, or a different angle.",
        variant: "destructive",
      })
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  /* ================= BACKEND WITH OCR FALLBACK ================= */
  const fetchScanResult = async (barcode: string) => {
    try {
      console.log("📡 Fetching product from API:", barcode)
      setProcessingStep("Searching database...")

      const res = await fetch(`${SCANNER_API}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      })

      const data = await res.json()
      console.log("📡 API Response:", data)

      if (!res.ok) {
        throw new Error(`API error ${res.status}`)
      }

      const hasIngredients =
        data.product?.ingredients_en?.length > 0 ||
        data.product?.ingredients_hi?.length > 0 ||
        (data.product?.rawIngredientsText && data.product.rawIngredientsText.length > 10)

      if (data.success && data.product && hasIngredients) {
        setProcessingStep("")

        const foundWarnings = checkIngredients(
          data.product.ingredients_en || [],
          data.product.ingredients_hi || []
        )
        setWarnings(foundWarnings)

        const resultData = {
          name: data.product.name || "Unknown Product",
          ingredients_en: data.product.ingredients_en || [],
          ingredients_hi: data.product.ingredients_hi || [],
          rawIngredientsText: data.product.rawIngredientsText || "",
          source: data.source || "database",
          barcode: barcode,
          verdict: {
            description: `✅ Found in ${data.source}. Contains ${data.product.ingredients_en?.length || 0} ingredients.`,
            riskScore: foundWarnings.length > 0 ? 80 : 0,
          },
        }

        setResult(resultData)
        setAddedToInventory(false)
        setShowInventoryForm(false)
        saveScanToHistory(resultData)
        setScanHistory(getScanHistory())
      } else {
        console.log("⚠️ Ingredients missing - need OCR")
        setProcessingStep("")

        const resultData = {
          name: data.product?.name || `Barcode: ${barcode}`,
          ingredients_en: [],
          ingredients_hi: [],
          rawIngredientsText: "",
          source: "incomplete",
          needsOCR: true,
          barcode: barcode,
          verdict: {
            description:
              "⚠️ Ingredients not available in database. Upload a clear image of the ingredients list for OCR analysis.",
            riskScore: 0,
          },
        }

        setResult(resultData)
        setAddedToInventory(false)
        setShowInventoryForm(false)
        saveScanToHistory(resultData)
        setScanHistory(getScanHistory())
      }
    } catch (err: any) {
      console.error("❌ API Error:", err)
      setProcessingStep("")

      const resultData = {
        name: `Barcode: ${barcode}`,
        ingredients_en: [],
        ingredients_hi: [],
        rawIngredientsText: "",
        source: "error",
        needsOCR: true,
        barcode: barcode,
        verdict: {
          description: `⚠️ Could not fetch from database: ${err.message}. Upload ingredients image for OCR.`,
          riskScore: 0,
        },
      }

      setResult(resultData)
      setAddedToInventory(false)
      setShowInventoryForm(false)
      saveScanToHistory(resultData)
      setScanHistory(getScanHistory())
    }
  }

  /* ================= OCR FROM CAMERA ================= */
  const captureForOCR = async () => {
    if (!videoRef.current || !canvasRef.current) {
      toast({ title: "Camera not ready", variant: "destructive" })
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      toast({ title: "Video not ready", description: "Please wait a moment.", variant: "destructive" })
      return
    }

    const context = canvas.getContext("2d")
    if (!context) return

    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b)
            else reject(new Error("Failed to create blob"))
          },
          "image/jpeg",
          0.95,
        )
      })

      const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
      await handleOCRUpload(file, result?.barcode)
    } catch (err) {
      console.error("Capture error:", err)
      toast({ title: "Capture failed", description: "Failed to capture image", variant: "destructive" })
    }
  }

  /* ================= OCR UPLOAD HANDLER ================= */
  const handleOCRUpload = async (file: File, barcode?: string) => {
    try {
      console.log("📸 Starting OCR on uploaded image...")
      const ocrResult = await performOCR(file)

      console.log("✅ OCR completed successfully")

      const foundWarnings = checkIngredients(ocrResult.ingredients_en, ocrResult.ingredients_hi)
      setWarnings(foundWarnings)

      const resultData = {
        name: barcode ? `Product: ${barcode}` : "OCR Analysis",
        ingredients_en: ocrResult.ingredients_en,
        ingredients_hi: ocrResult.ingredients_hi,
        rawIngredientsText: ocrResult.rawText,
        source: "ocr",
        barcode: barcode,
        verdict: {
          description: `✅ OCR extracted ${ocrResult.ingredients_en.length + ocrResult.ingredients_hi.length} ingredients. Please verify accuracy.`,
          riskScore: foundWarnings.length > 0 ? 80 : 0,
        },
      }

      setResult(resultData)
      setAddedToInventory(false)
      setShowInventoryForm(false)
      saveScanToHistory(resultData)
      const updated = getScanHistory()
      setScanHistory(updated)

      console.log("💾 Scan saved to localStorage")
    } catch (err: any) {
      console.error("❌ OCR failed:", err)
      toast({ title: "OCR failed", description: err?.message || "Unknown error", variant: "destructive" })
    }
  }

  /* ================= LOAD PREVIOUS SCAN ================= */
  const loadPreviousScan = (scan: any) => {
    setResult(scan)
    setBarcode(scan.barcode || null)
    setShowHistory(false)
    setAddedToInventory(false)
    setShowInventoryForm(false)
    const foundWarnings = checkIngredients(scan.ingredients_en || [], scan.ingredients_hi || [])
    setWarnings(foundWarnings)
  }

  /* ================= ADD TO INVENTORY ================= */
  const handleAddToInventory = () => {
    if (!result?.name) {
      toast({ title: "Nothing to add", variant: "destructive" })
      return
    }
    const qty = parseFloat(inventoryForm.quantity)
    addPantryItem.mutate(
      {
        name: result.name,
        quantity: isNaN(qty) ? undefined : qty,
        unit: inventoryForm.unit,
        category: inventoryForm.category,
        expiryDate: inventoryForm.expiryDate || undefined,
      } as any,
      {
        onSuccess: () => {
          setAddedToInventory(true)
          setShowInventoryForm(false)
          toast({
            title: "Added to inventory",
            description: result.name,
          })
        },
        onError: (err: any) => {
          toast({
            title: "Could not add",
            description: err?.message || "Please try again",
            variant: "destructive",
          })
        },
      }
    )
  }

  /* ================= CLEANUP ================= */
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
        scanIntervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      if (ocrWorkerRef.current) {
        try { ocrWorkerRef.current.terminate?.() } catch { /* noop */ }
        ocrWorkerRef.current = null
      }
    }
  }, [])

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ScanBarcode className="w-8 h-8" />
            Smart Barcode Scanner + OCR
          </h1>
          <p className="text-muted-foreground mt-1">Scan → OpenFoodFacts → OCR Fallback (Auto Extract)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT SIDE: Input Controls */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Input Options</CardTitle>
                <CardDescription>Choose a scanning method</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* USER PROFILE STATUS */}
                {profile && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <p className="text-xs font-semibold text-blue-900">
                        Profile Active: {profile.name || user?.name || user?.email}
                      </p>
                    </div>
                    <div className="text-xs text-blue-700 space-y-1">
                      {profile.allergies && Array.isArray(profile.allergies) && profile.allergies.length > 0 && (
                        <p className="font-medium">
                          🚨 Allergies: {profile.allergies.join(", ")}
                        </p>
                      )}
                      {profile.disliked_foods && Array.isArray(profile.disliked_foods) && profile.disliked_foods.length > 0 && (
                        <p>❌ Dislikes: {profile.disliked_foods.join(", ")}</p>
                      )}
                      {profile.diseases && Array.isArray(profile.diseases) && profile.diseases.length > 0 && (
                        <p className="font-medium">⚕️ Health: {profile.diseases.join(", ")}</p>
                      )}
                      {profile.other_restrictions && (
                        <p>⚠️ Restrictions: {profile.other_restrictions}</p>
                      )}
                      {(!profile.allergies || profile.allergies.length === 0) &&
                        (!profile.disliked_foods || profile.disliked_foods.length === 0) &&
                        (!profile.diseases || profile.diseases.length === 0) &&
                        !profile.other_restrictions && (
                          <p className="text-blue-600">No restrictions set. Update your profile to enable warnings.</p>
                        )}
                    </div>
                  </div>
                )}

                {!profile && user && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-900">
                      ⚠️ Profile not loaded. Go to Dashboard to set up allergies and restrictions.
                    </p>
                  </div>
                )}

                {/* PROCESSING STATUS */}
                {(ocrProcessing || processingStep) && (
                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <p className="text-sm font-medium text-yellow-900">{processingStep || "Processing..."}</p>
                    </div>
                    {ocrProcessing && ocrProgress > 0 && <Progress value={ocrProgress} className="h-2" />}
                  </div>
                )}

                {/* SCAN HISTORY BUTTON */}
                <Button
                  onClick={() => setShowHistory(!showHistory)}
                  variant="outline"
                  className="w-full"
                >
                  <History className="w-4 h-4 mr-2" />
                  Scan History ({scanHistory.length})
                </Button>

                {/* PRODUCT NAME SEARCH */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900 mb-3">
                    🔎 Search Product in Database:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                      placeholder="e.g. Kinder Joy, Maggi noodles..."
                      className="flex-1 px-3 py-2 border border-emerald-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      disabled={searching || ocrProcessing}
                    />
                    <Button
                      onClick={searchProducts}
                      disabled={!searchQuery.trim() || searching || ocrProcessing}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {searching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-1" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-emerald-700 mt-2">
                    Find products without scanning. Not found? Use OCR on the back.
                  </p>

                  {/* SEARCH RESULTS */}
                  {searchResults.length > 0 && (
                    <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
                      {searchResults.map((hit: any) => (
                        <div
                          key={hit.code}
                          onClick={() => pickSearchResult(hit)}
                          className="flex gap-2 p-2 bg-white border border-emerald-200 rounded cursor-pointer hover:bg-emerald-100 transition"
                        >
                          {hit.image_small_url && (
                            <img
                              src={hit.image_small_url}
                              alt=""
                              className="w-10 h-10 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {hit.product_name || hit.brands || "Unnamed product"}
                            </p>
                            {hit.brands && hit.product_name && (
                              <p className="text-xs text-gray-600 truncate">{hit.brands}</p>
                            )}
                            <p className="text-xs text-gray-500 font-mono">{hit.code}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchPerformed && searchResults.length === 0 && !searching && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-900 space-y-2">
                      <p className="font-medium">No matches found in the database.</p>
                      <p>📸 Capture the ingredients label on the back to analyse with OCR.</p>
                      <Button
                        onClick={() => {
                          setSearchPerformed(false)
                          startOCRCameraMode()
                        }}
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={ocrProcessing}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Capture Ingredients (OCR)
                      </Button>
                    </div>
                  )}
                </div>

                {/* MANUAL BARCODE INPUT */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 mb-3">⌨️ Enter Barcode Manually:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                      placeholder="Enter barcode number..."
                      className="flex-1 px-3 py-2 border border-purple-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      maxLength={14}
                      disabled={ocrProcessing}
                    />
                    <Button
                      onClick={handleManualSubmit}
                      disabled={!manualBarcode.trim() || ocrProcessing}
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Search
                    </Button>
                  </div>
                  <p className="text-xs text-purple-600 mt-2">Try: 8000500310427 (Kinder Joy)</p>
                </div>

                {/* INSTRUCTIONS */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">📋 Workflow:</p>
                  <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                    <li>Scan barcode → Searches OpenFoodFacts</li>
                    <li>If ingredients missing → Use camera for OCR</li>
                    <li>OCR extracts ingredients automatically</li>
                    <li>✨ Data saved to localStorage automatically</li>
                  </ol>
                </div>

                {/* CAMERA SELECTOR */}
                {videoDevices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <SwitchCamera className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <Select
                      value={selectedDeviceId}
                      onValueChange={(v) => switchCamera(v)}
                      disabled={ocrProcessing}
                    >
                      <SelectTrigger className="flex-1 h-9 text-xs">
                        <SelectValue placeholder="Choose a camera" />
                      </SelectTrigger>
                      <SelectContent>
                        {videoDevices.map((d, idx) => (
                          <SelectItem key={d.deviceId || idx} value={d.deviceId}>
                            {d.label || `Camera ${idx + 1}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* VIDEO PREVIEW */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  {!cameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-gray-400">
                      <Camera className="w-16 h-16 mb-2" />
                      <p className="text-sm">Camera off</p>
                    </div>
                  )}

                  {cameraOn && !ocrCameraMode && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div
                        className={`w-72 h-40 border-4 border-green-400 rounded-lg relative ${continuousScanning ? "animate-pulse" : ""}`}
                      >
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white"></div>
                        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-sm bg-black/70 px-3 py-2 rounded">
                          {continuousScanning ? "🔍 Scanning..." : "Align barcode here"}
                        </p>
                      </div>
                    </div>
                  )}

                  {cameraOn && ocrCameraMode && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="border-4 border-blue-400 rounded-lg relative w-80 h-52">
                        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white"></div>
                        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white"></div>
                        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white"></div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white"></div>
                        <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-sm bg-black/70 px-3 py-2 rounded text-center">
                          📸 OCR Mode
                          <br />
                          Align ingredients list
                        </p>
                      </div>
                    </div>
                  )}

                  {continuousScanning && scanAttempts > 0 && (
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs">
                      Attempts: {scanAttempts}
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="space-y-2">
                  {!cameraOn ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={startCamera} className="flex-1" size="lg" disabled={ocrProcessing}>
                        <Camera className="w-5 h-5 mr-2" />
                        Camera for Barcode
                      </Button>
                      <Button
                        onClick={startOCRCameraMode}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        size="lg"
                        disabled={ocrProcessing}
                      >
                        <FileText className="w-5 h-5 mr-2" />
                        Camera for OCR
                      </Button>
                    </div>
                  ) : (
                    <>
                      {ocrCameraMode ? (
                        <div className="space-y-2">
                          <Button
                            onClick={captureForOCR}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            size="lg"
                            disabled={ocrProcessing}
                          >
                            <FileText className="w-5 h-5 mr-2" />
                            {ocrProcessing ? "Processing..." : "Capture & Extract"}
                          </Button>
                          <Button
                            onClick={stopCamera}
                            variant="outline"
                            className="w-full bg-transparent"
                            disabled={ocrProcessing}
                          >
                            Close Camera
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {!continuousScanning ? (
                            <Button
                              onClick={startContinuousScan}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              size="lg"
                              disabled={ocrProcessing}
                            >
                              <PlayCircle className="w-5 h-5 mr-2" />
                              Start Scanning
                            </Button>
                          ) : (
                            <Button
                              onClick={stopContinuousScan}
                              className="flex-1 bg-red-600 hover:bg-red-700"
                              size="lg"
                            >
                              <StopCircle className="w-5 h-5 mr-2" />
                              Stop Scanning
                            </Button>
                          )}
                          <Button onClick={stopCamera} variant="outline" size="lg" disabled={ocrProcessing}>
                            Close Camera
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* UPLOAD OPTIONS */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full"
                    disabled={ocrProcessing}
                  >
                    <ScanBarcode className="w-4 h-4 mr-2" />
                    Upload for Barcode
                  </Button>
                  <Button
                    onClick={() => ocrFileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full"
                    disabled={ocrProcessing}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload for OCR
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (file) scanFromFile(file)
                  }}
                />

                <input
                  ref={ocrFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ""
                    if (file) handleOCRUpload(file, result?.barcode)
                  }}
                />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE: Output Results */}
          <div className="space-y-4">
            {/* HISTORY PANEL */}
            {showHistory && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Scan History</CardTitle>
                      <CardDescription>All scans saved locally</CardDescription>
                    </div>
                    {scanHistory.length > 0 && (
                      <Button
                        onClick={() => {
                          clearScanHistory()
                          setScanHistory([])
                        }}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {scanHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No scans yet. Start scanning!</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {scanHistory.map((scan: any) => (
                        <div
                          key={scan.id}
                          onClick={() => loadPreviousScan(scan)}
                          className="p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{scan.name}</p>
                              {scan.barcode && (
                                <p className="text-xs text-gray-600 font-mono">{scan.barcode}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(scan.timestamp).toLocaleDateString()} {new Date(scan.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                              {scan.source}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* RESULTS CARD */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Results</CardTitle>
                <CardDescription>Scanned product information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* BARCODE RESULT */}
                {barcode && (
                  <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                    <p className="text-sm font-bold text-green-900 text-center">✅ BARCODE DETECTED</p>
                    <p className="text-2xl font-mono text-center text-green-700 mt-2">{barcode}</p>
                  </div>
                )}

                {/* PRODUCT RESULT */}
                {result ? (
                  <Card className={`border-2 ${result.needsOCR ? "border-yellow-500" : "border-green-500"}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{result.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        {result.source === "ocr" && <FileText className="w-4 h-4" />}
                        Source: {result.source === "ocr" ? "OCR Extraction" : result.source}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* WARNINGS - ALLERGIES, DISLIKES & DISEASES */}
                      {warnings.length > 0 && (
                        <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg space-y-2 animate-pulse">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                            <h3 className="text-base font-bold text-red-900">⚠️ WARNINGS DETECTED</h3>
                          </div>
                          <div className="space-y-2">
                            {warnings.map((warning, idx) => {
                              const isAllergy = warning.includes('ALLERGY ALERT')
                              const isDisease = warning.includes('WARNING:')
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded font-medium ${
                                    isAllergy
                                      ? 'bg-red-200 border-2 border-red-600 text-red-900'
                                      : isDisease
                                      ? 'bg-orange-100 border border-orange-400 text-orange-900'
                                      : 'bg-red-100 border border-red-400 text-red-900'
                                  }`}
                                >
                                  {warning}
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-red-700 mt-3 font-medium bg-red-100 p-2 rounded">
                            ⚠️ This product contains ingredients that may not be safe for you based on your profile. Please verify carefully before consuming.
                          </p>
                        </div>
                      )}

                      {warnings.length === 0 && result && !result.needsOCR && (
                        <div className="p-3 bg-green-50 border border-green-300 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="text-sm font-medium text-green-900">
                              ✅ No allergens or restricted ingredients detected
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ADD TO INVENTORY */}
                      {result && result.name && (
                        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
                          {!showInventoryForm && !addedToInventory && (
                            <Button
                              onClick={() => setShowInventoryForm(true)}
                              className="w-full bg-indigo-600 hover:bg-indigo-700"
                              disabled={addPantryItem.isPending}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Inventory
                            </Button>
                          )}

                          {addedToInventory && (
                            <div className="flex items-center gap-2 text-green-800">
                              <Check className="w-5 h-5" />
                              <p className="text-sm font-medium">Added to your pantry</p>
                            </div>
                          )}

                          {showInventoryForm && !addedToInventory && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-700" />
                                <p className="text-sm font-semibold text-indigo-900">
                                  Add "{result.name}" to pantry
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-indigo-800">Quantity</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={inventoryForm.quantity}
                                    onChange={(e) =>
                                      setInventoryForm({ ...inventoryForm, quantity: e.target.value })
                                    }
                                    className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-indigo-800">Unit</label>
                                  <Select
                                    value={inventoryForm.unit}
                                    onValueChange={(v) =>
                                      setInventoryForm({ ...inventoryForm, unit: v })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {["pc", "g", "kg", "ml", "L", "cup", "tbsp", "tsp"].map(
                                        (u) => (
                                          <SelectItem key={u} value={u}>
                                            {u}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs text-indigo-800">Category</label>
                                  <Select
                                    value={inventoryForm.category}
                                    onValueChange={(v) =>
                                      setInventoryForm({ ...inventoryForm, category: v })
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[
                                        "Grains",
                                        "Legumes",
                                        "Flour",
                                        "Vegetables",
                                        "Spices",
                                        "Dairy",
                                        "Other",
                                      ].map((c) => (
                                        <SelectItem key={c} value={c}>
                                          {c}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs text-indigo-800">Expiry (optional)</label>
                                  <input
                                    type="date"
                                    value={inventoryForm.expiryDate}
                                    onChange={(e) =>
                                      setInventoryForm({
                                        ...inventoryForm,
                                        expiryDate: e.target.value,
                                      })
                                    }
                                    className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleAddToInventory}
                                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                  disabled={addPantryItem.isPending}
                                >
                                  {addPantryItem.isPending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Adding...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-2" />
                                      Confirm
                                    </>
                                  )}
                                </Button>
                                <Button
                                  onClick={() => setShowInventoryForm(false)}
                                  variant="outline"
                                  disabled={addPantryItem.isPending}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {result.needsOCR && (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg space-y-3">
                          <p className="text-sm font-medium text-yellow-900">
                            📸 Ingredients not in database - Use camera to capture ingredients
                          </p>

                          {!cameraOn ? (
                            <Button
                              onClick={startOCRCameraMode}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              disabled={ocrProcessing}
                            >
                              <Camera className="w-4 h-4 mr-2" />
                              Turn On Camera for OCR
                            </Button>
                          ) : ocrCameraMode ? (
                            <Button
                              onClick={captureForOCR}
                              className="w-full bg-green-600 hover:bg-green-700"
                              disabled={ocrProcessing}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              {ocrProcessing ? "Processing..." : "Capture & Extract Ingredients"}
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                setOcrCameraMode(true)
                                setContinuousScanning(false)
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              disabled={ocrProcessing}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Switch to OCR Mode
                            </Button>
                          )}

                          <p className="text-xs text-yellow-700">
                            💡 <strong>Tips:</strong> Point camera at ingredients list, ensure good lighting and focus,
                            then click capture
                          </p>
                        </div>
                      )}

                      {result.ingredients_en && result.ingredients_en.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            🇬🇧 Ingredients - English ({result.ingredients_en.length})
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {result.ingredients_en.map((ing: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {ing}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.ingredients_hi && result.ingredients_hi.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">
                            🇮🇳 सामग्री - हिंदी ({result.ingredients_hi.length})
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {result.ingredients_hi.map((ing: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {ing}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {result.rawIngredientsText && (
                        <div>
                          <h3 className="text-sm font-semibold mb-2">Raw Ingredient Text</h3>
                          <p className="text-xs text-muted-foreground bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                            {result.rawIngredientsText}
                          </p>
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Status
                        </h3>
                        <p className="text-sm text-muted-foreground">{result.verdict.description}</p>
                        {result.verdict.riskScore > 0 && <Progress value={result.verdict.riskScore} className="mt-2" />}
                      </div>

                      {result.source === "ocr" && result.barcode && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-900">
                            💾 <strong>Saved to localStorage:</strong> This OCR data persists across navigation!
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <ScanBarcode className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">No results yet. Start scanning to see product information here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}