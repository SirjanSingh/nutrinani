"use client"

import { useEffect, useRef, useState } from "react"
import { BrowserMultiFormatReader } from "@zxing/browser"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScanBarcode, Loader2, AlertTriangle, Camera, PlayCircle, StopCircle, FileText, User, Trash2, History, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useProfile } from "@/contexts/ProfileContext"
import { useAuth } from "@/contexts/AuthContext"

/* ================= CONFIG ================= */
const SCANNER_API = "https://ubav5knsp8.execute-api.ap-south-1.amazonaws.com"  // ap-south-1
const RECIPE_API = "https://tfn02c762l.execute-api.ap-southeast-2.amazonaws.com"  // ap-southeast-2
const STORAGE_KEY = "scan_history"

/* ================= ZXING READER ================= */
const codeReader = new BrowserMultiFormatReader()

/* ================= TESSERACT LOADER ================= */
declare global {
  interface Window {
    Tesseract: any
  }
}

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

/* ================= TEXT CLEANING ================= */
const cleanIngredientText = (text: string): string => {
  return text
    .replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è').replace(/Ã /g, 'à')
    .replace(/Ã®/g, 'î').replace(/Ã´/g, 'ô').replace(/Ã¼/g, 'ü')
    .replace(/Ã§/g, 'ç').replace(/Ã±/g, 'ñ').replace(/Â©/g, '©')
    .replace(/Â®/g, '®').replace(/Â°/g, '°')
    .replace(/PA©te/gi, 'Pâte').replace(/À /g, 'à ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const cleanIngredientList = (items: string[]): string[] => {
  return items.map(cleanIngredientText).filter(i => i.length > 1)
}

/* ================= SUITABILITY SCORE ================= */
const computeSuitabilityScore = (
  ingredients_en: string[],
  ingredients_hi: string[],
  profile: any
): { score: number; breakdown: { label: string; penalty: number; matched: string }[] } => {
  if (!profile) return { score: 100, breakdown: [] }

  const allIngredients = [...ingredients_en, ...ingredients_hi].map(i => i.toLowerCase())
  if (allIngredients.length === 0) return { score: 100, breakdown: [] }

  let score = 100
  const breakdown: { label: string; penalty: number; matched: string }[] = []

  // Allergy matches: -30 each
  if (profile.allergies?.length) {
    profile.allergies.forEach((a: string) => {
      const aLow = a.toLowerCase()
      const match = allIngredients.find(i => i.includes(aLow))
      if (match) {
        score -= 30
        breakdown.push({ label: `Allergy: ${a}`, penalty: -30, matched: match })
      }
    })
  }

  // Disease conflicts: -20 each
  const diseaseMap: Record<string, string[]> = {
    diabetes: ['sugar', 'glucose', 'fructose', 'sucrose', 'corn syrup', 'honey', 'dextrose'],
    hypertension: ['salt', 'sodium', 'msg', 'monosodium glutamate'],
    'high bp': ['salt', 'sodium', 'msg'],
    heart: ['palm oil', 'hydrogenated', 'trans fat', 'lard', 'butter'],
    celiac: ['wheat', 'gluten', 'barley', 'rye', 'malt', 'semolina'],
    'fatty liver': ['palm oil', 'hydrogenated', 'high fructose corn syrup'],
    gout: ['yeast extract', 'meat extract', 'anchovies'],
  }
  if (profile.diseases?.length) {
    profile.diseases.forEach((d: string) => {
      const dLow = d.toLowerCase()
      for (const [key, terms] of Object.entries(diseaseMap)) {
        if (dLow.includes(key)) {
          const match = terms.find(t => allIngredients.some(i => i.includes(t)))
          if (match) {
            score -= 20
            breakdown.push({ label: `Health (${d})`, penalty: -20, matched: match })
          }
        }
      }
    })
  }

  // Dislike matches: -10 each
  if (profile.disliked_foods?.length) {
    profile.disliked_foods.forEach((d: string) => {
      const dLow = d.toLowerCase()
      const match = allIngredients.find(i => i.includes(dLow))
      if (match) {
        score -= 10
        breakdown.push({ label: `Dislike: ${d}`, penalty: -10, matched: match })
      }
    })
  }

  // Diet type violation: -15
  if (profile.diet_type) {
    const nonVegTerms = ['chicken', 'mutton', 'beef', 'pork', 'fish', 'meat', 'gelatin', 'lard', 'tallow']
    const nonVeganTerms = [...nonVegTerms, 'milk', 'dairy', 'cream', 'butter', 'cheese', 'whey', 'casein', 'egg', 'honey']
    const eggTerms = ['chicken', 'mutton', 'beef', 'pork', 'fish', 'meat', 'gelatin', 'lard']

    let checkTerms: string[] = []
    if (profile.diet_type === 'vegan') checkTerms = nonVeganTerms
    else if (profile.diet_type === 'vegetarian') checkTerms = nonVegTerms
    else if (profile.diet_type === 'eggetarian') checkTerms = eggTerms

    const match = checkTerms.find(t => allIngredients.some(i => i.includes(t)))
    if (match) {
      score -= 15
      breakdown.push({ label: `Diet (${profile.diet_type})`, penalty: -15, matched: match })
    }
  }

  return { score: Math.max(0, Math.min(100, score)), breakdown }
}

export const Scanner = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ocrFileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<number | null>(null)
  const isScannedRef = useRef(false)

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
  const [suitability, setSuitability] = useState<{ score: number; breakdown: { label: string; penalty: number; matched: string }[] } | null>(null)

  /* ================= LOAD HISTORY ON MOUNT ================= */
  useEffect(() => {
    const history = getScanHistory()
    setScanHistory(history)
  }, [])

  /* ================= CHECK FOR ALLERGENS, DISLIKES & DISEASES ================= */
  const checkIngredients = (ingredients_en: string[], ingredients_hi: string[]) => {
    if (!profile) return []

    const allIngredients = [...ingredients_en, ...ingredients_hi].map((ing) => ing.toLowerCase())
    const foundWarnings: string[] = []

    if (profile.allergies && Array.isArray(profile.allergies) && profile.allergies.length > 0) {
      profile.allergies.forEach((allergen: string) => {
        const allergenLower = allergen.toLowerCase()
        const found = allIngredients.some((ing) => ing.includes(allergenLower))
        if (found) {
          foundWarnings.push(`🚨 ALLERGY ALERT: Contains ${allergen}`)
        }
      })
    }

    if (profile.disliked_foods && Array.isArray(profile.disliked_foods) && profile.disliked_foods.length > 0) {
      profile.disliked_foods.forEach((dislike: string) => {
        const dislikeLower = dislike.toLowerCase()
        const found = allIngredients.some((ing) => ing.includes(dislikeLower))
        if (found) {
          foundWarnings.push(`❌ DISLIKE: Contains ${dislike}`)
        }
      })
    }

    if (profile.diseases && Array.isArray(profile.diseases) && profile.diseases.length > 0) {
      const diseaseWarnings: string[] = []
      
      profile.diseases.forEach((disease: string) => {
        const diseaseLower = disease.toLowerCase()
        
        if (diseaseLower.includes('diabetes')) {
          const sugarTerms = ['sugar', 'glucose', 'fructose', 'sucrose', 'corn syrup', 'honey', 'molasses', 'dextrose']
          const foundSugar = sugarTerms.some(term => 
            allIngredients.some(ing => ing.includes(term))
          )
          if (foundSugar) {
            diseaseWarnings.push(`⚕️ DIABETES WARNING: Contains high sugar ingredients`)
          }
        }
        
        if (diseaseLower.includes('hypertension') || diseaseLower.includes('high bp')) {
          const saltTerms = ['salt', 'sodium', 'monosodium glutamate', 'msg', 'sodium chloride']
          const foundSalt = saltTerms.some(term => 
            allIngredients.some(ing => ing.includes(term))
          )
          if (foundSalt) {
            diseaseWarnings.push(`⚕️ HYPERTENSION WARNING: Contains high sodium/salt`)
          }
        }
        
        if (diseaseLower.includes('heart')) {
          const fatTerms = ['palm oil', 'hydrogenated', 'trans fat', 'saturated fat', 'lard', 'butter']
          const foundFat = fatTerms.some(term => 
            allIngredients.some(ing => ing.includes(term))
          )
          if (foundFat) {
            diseaseWarnings.push(`⚕️ HEART HEALTH WARNING: Contains unhealthy fats`)
          }
        }
        
        if (diseaseLower.includes('celiac')) {
          const glutenTerms = ['wheat', 'gluten', 'barley', 'rye', 'malt', 'semolina', 'durum']
          const foundGluten = glutenTerms.some(term => 
            allIngredients.some(ing => ing.includes(term))
          )
          if (foundGluten) {
            diseaseWarnings.push(`⚕️ CELIAC WARNING: Contains gluten`)
          }
        }
        
        if (diseaseLower.includes('fatty liver')) {
          const fattyLiverTerms = ['palm oil', 'hydrogenated', 'trans fat', 'high fructose corn syrup']
          const foundRisk = fattyLiverTerms.some(term => 
            allIngredients.some(ing => ing.includes(term))
          )
          if (foundRisk) {
            diseaseWarnings.push(`⚕️ FATTY LIVER WARNING: Contains ingredients to avoid`)
          }
        }
        
        if (diseaseLower.includes('gout')) {
          const purinTerms = ['yeast extract', 'meat extract', 'anchovies', 'sardines']
          const foundPurin = purinTerms.some(term => 
            allIngredients.some(ing => ing.includes(term))
          )
          if (foundPurin) {
            diseaseWarnings.push(`⚕️ GOUT WARNING: Contains high-purine ingredients`)
          }
        }
      })
      
      foundWarnings.push(...diseaseWarnings)
    }

    if (profile.other_restrictions && typeof profile.other_restrictions === 'string') {
      const restrictionsList = profile.other_restrictions
        .split(',')
        .map((r: string) => r.trim().toLowerCase())
        .filter((r: string) => r.length > 2)
      
      restrictionsList.forEach((restriction: string) => {
        const found = allIngredients.some((ing) => ing.includes(restriction))
        if (found) {
          foundWarnings.push(`⚠️ RESTRICTION: Contains ${restriction}`)
        }
      })
    }

    return foundWarnings
  }

  /* ================= MANUAL BARCODE ENTRY ================= */
  const handleManualSubmit = async () => {
    const trimmed = manualBarcode.trim()
    if (!trimmed) {
      alert("Please enter a barcode")
      return
    }

    if (trimmed.length < 8 || trimmed.length > 14) {
      alert("Barcode should be 8-14 digits")
      return
    }

    console.log("✍️ Manual barcode entry:", trimmed)

    setBarcode(trimmed)
    setManualBarcode("")
    await fetchScanResult(trimmed)
  }

  /* ================= CAMERA ================= */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraOn(true)
        console.log("✅ Camera started")
      }
    } catch (err) {
      console.error("❌ Camera error:", err)
      alert("Cannot access camera. Please check permissions.")
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
      alert("Camera not ready")
      return
    }

    setContinuousScanning(true)
    isScannedRef.current = false
    setBarcode(null)
    setResult(null)
    setScanAttempts(0)

    console.log("🔄 Starting continuous scan mode...")

    scanIntervalRef.current = window.setInterval(() => {
      if (!isScannedRef.current) {
        scanFrame()
      }
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

    try {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      setScanAttempts((prev) => prev + 1)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error("Failed to create blob"))
        }, "image/png")
      })

      const imageUrl = URL.createObjectURL(blob)

      try {
        const result = await codeReader.decodeFromImageUrl(imageUrl)
        const code = result.getText()

        console.log("✅ BARCODE DETECTED:", code)

        isScannedRef.current = true
        stopContinuousScan()
        setBarcode(code)
        await fetchScanResult(code)
        playBeep()
      } catch (decodeErr) {
        if (scanAttempts >= 20) {
          console.log("⚠️ No barcode after 20 attempts - triggering OCR fallback")
          isScannedRef.current = true
          stopContinuousScan()

          const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
          await handleOCRUpload(file)
          playBeep()
        }
      }

      URL.revokeObjectURL(imageUrl)
    } catch (err) {
      console.error("Frame scan error:", err)
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

  /* ================= OCR WITH TESSERACT ================= */
  const performOCR = async (imageFile: File) => {
    setOcrProcessing(true)
    setOcrProgress(0)
    setProcessingStep("Loading OCR engine...")

    try {
      const Tesseract = await loadTesseract()
      setProcessingStep("Initializing OCR worker...")

      const worker = await Tesseract.createWorker("eng", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100))
            setProcessingStep(`Reading text... ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      setProcessingStep("Pre-processing image...")

      const processedImage = await preprocessImage(imageFile)

      setProcessingStep("Analyzing image...")
      const {
        data: { text },
      } = await worker.recognize(processedImage, {
        rotateAuto: true,
      })

      await worker.terminate()

      console.log("📝 OCR Raw Text:", text)

      setProcessingStep("Extracting ingredients...")
      const ingredients = extractIngredients(text)

      setOcrProcessing(false)
      setProcessingStep("")
      setOcrProgress(0)

      return ingredients
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
    return new Promise((resolve, reject) => {
      const img = new Image()
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(file)
        return
      }

      img.onload = () => {
        const scale = 3
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        }

        const threshold = 128
        for (let i = 0; i < data.length; i += 4) {
          const value = data[i] > threshold ? 255 : 0
          data[i] = value
          data[i + 1] = value
          data[i + 2] = value
        }

        const contrast = 80
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))

        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
          data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
          data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
        }

        ctx.putImageData(imageData, 0, 0)

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            resolve(file)
          }
        }, "image/png")
      }

      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
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

    try {
      const imageUrl = URL.createObjectURL(file)
      console.log("🔍 Scanning uploaded image for barcode...")

      const result = await codeReader.decodeFromImageUrl(imageUrl)

      const code = result.getText()
      console.log("✅ Barcode found in image:", code)

      setBarcode(code)
      await fetchScanResult(code)

      URL.revokeObjectURL(imageUrl)
    } catch (err) {
      console.error("❌ No barcode in image:", err)
      alert("No barcode detected. Try:\n• Clearer photo\n• Better lighting\n• Different angle")
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
        data.product?.ingredients_translated?.length > 0 ||
        (data.product?.rawIngredientsText && data.product.rawIngredientsText.length > 10)

      if (data.success && data.product && hasIngredients) {
        setProcessingStep("")

        // Fix 1: Map ingredients_translated → ingredients_hi
        const rawEn = data.product.ingredients_en || []
        const rawHi = data.product.ingredients_hi || data.product.ingredients_translated || []

        // Fix 2: Clean encoding artifacts
        const cleanEn = cleanIngredientList(rawEn)
        const cleanHi = cleanIngredientList(rawHi)
        
        const foundWarnings = checkIngredients(cleanEn, cleanHi)
        setWarnings(foundWarnings)

        // Fix 3: Compute suitability score
        const suit = computeSuitabilityScore(cleanEn, cleanHi, profile)
        setSuitability(suit)

        const resultData = {
          name: data.product.name || "Unknown Product",
          ingredients_en: cleanEn,
          ingredients_hi: cleanHi,
          rawIngredientsText: data.product.rawIngredientsText || "",
          source: data.source || "database",
          barcode: barcode,
          verdict: {
            description: `✅ Found in ${data.source}. Contains ${cleanEn.length + cleanHi.length} ingredients.`,
            riskScore: foundWarnings.length > 0 ? 80 : 0,
          },
        }

        setResult(resultData)
        saveScanToHistory(resultData)
        const updated = getScanHistory()
        setScanHistory(updated)
      } else {
        console.log("⚠️ Ingredients missing - need OCR")
        setProcessingStep("")
        setSuitability(null)
        
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
        saveScanToHistory(resultData)
        const updated = getScanHistory()
        setScanHistory(updated)
      }
    } catch (err: any) {
      console.error("❌ API Error:", err)
      setProcessingStep("")
      setSuitability(null)
      
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
      saveScanToHistory(resultData)
      const updated = getScanHistory()
      setScanHistory(updated)
    }
  }

  /* ================= OCR FROM CAMERA ================= */
  const captureForOCR = async () => {
    if (!videoRef.current || !canvasRef.current) {
      alert("Camera not ready")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      alert("Video not ready. Please wait a moment.")
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
      alert("Failed to capture image")
    }
  }

  /* ================= OCR UPLOAD HANDLER ================= */
  const handleOCRUpload = async (file: File, barcode?: string) => {
    try {
      console.log("📸 Starting OCR on uploaded image...")
      const ocrResult = await performOCR(file)

      console.log("✅ OCR completed successfully")

      const cleanEn = cleanIngredientList(ocrResult.ingredients_en)
      const cleanHi = cleanIngredientList(ocrResult.ingredients_hi)

      const foundWarnings = checkIngredients(cleanEn, cleanHi)
      setWarnings(foundWarnings)

      const suit = computeSuitabilityScore(cleanEn, cleanHi, profile)
      setSuitability(suit)

      const resultData = {
        name: barcode ? `Product: ${barcode}` : "OCR Analysis",
        ingredients_en: cleanEn,
        ingredients_hi: cleanHi,
        rawIngredientsText: ocrResult.rawText,
        source: "ocr",
        barcode: barcode,
        verdict: {
          description: `✅ OCR extracted ${cleanEn.length + cleanHi.length} ingredients. Please verify accuracy.`,
          riskScore: foundWarnings.length > 0 ? 80 : 0,
        },
      }

      setResult(resultData)
      saveScanToHistory(resultData)
      const updated = getScanHistory()
      setScanHistory(updated)

      console.log("💾 Scan saved to localStorage")
    } catch (err: any) {
      console.error("❌ OCR failed:", err)
      alert(`OCR failed: ${err.message}`)
    }
  }

  /* ================= LOAD PREVIOUS SCAN ================= */
  const loadPreviousScan = (scan: any) => {
    setResult(scan)
    setBarcode(scan.barcode || null)
    setShowHistory(false)
    const foundWarnings = checkIngredients(scan.ingredients_en || [], scan.ingredients_hi || [])
    setWarnings(foundWarnings)
    const suit = computeSuitabilityScore(scan.ingredients_en || [], scan.ingredients_hi || [], profile)
    setSuitability(suit)
  }

  /* ================= CLEANUP ================= */
  useEffect(() => {
    return () => {
      stopCamera()
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

                {/* MANUAL BARCODE INPUT */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-medium text-purple-900 mb-3">⌨️ Enter Barcode Manually:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualBarcode}
                      onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
                      onKeyPress={(e) => e.key === "Enter" && handleManualSubmit()}
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
                <div className="grid grid-cols-1">
                  <Button
                    onClick={() => ocrFileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full"
                    disabled={ocrProcessing}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Image for OCR
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
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

                      {/* SUITABILITY SCORE GAUGE */}
                      {suitability && !result.needsOCR && (
                        <div className={`p-5 rounded-xl border-2 ${
                          suitability.score >= 80 ? 'bg-emerald-50 border-emerald-400' :
                          suitability.score >= 50 ? 'bg-amber-50 border-amber-400' :
                          'bg-red-50 border-red-400'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {suitability.score >= 80 ? <ShieldCheck className="w-6 h-6 text-emerald-600" /> :
                               suitability.score >= 50 ? <ShieldAlert className="w-6 h-6 text-amber-600" /> :
                               <ShieldX className="w-6 h-6 text-red-600" />}
                              <span className="text-sm font-semibold">Suitability for You</span>
                            </div>
                            <Badge className={`text-base px-3 py-1 ${
                              suitability.score >= 80 ? 'bg-emerald-600 hover:bg-emerald-700' :
                              suitability.score >= 50 ? 'bg-amber-500 hover:bg-amber-600' :
                              'bg-red-600 hover:bg-red-700'
                            } text-white`}>
                              {suitability.score >= 80 ? 'Safe for You' :
                               suitability.score >= 50 ? 'Use Caution' : 'Avoid'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 mb-3">
                            <span className={`text-4xl font-black ${
                              suitability.score >= 80 ? 'text-emerald-700' :
                              suitability.score >= 50 ? 'text-amber-700' :
                              'text-red-700'
                            }`}>{suitability.score}%</span>
                            <div className="flex-1">
                              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    suitability.score >= 80 ? 'bg-emerald-500' :
                                    suitability.score >= 50 ? 'bg-amber-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${suitability.score}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {suitability.breakdown.length > 0 && (
                            <div className="space-y-1.5 mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Breakdown:</p>
                              {suitability.breakdown.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-800">{item.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 italic">({item.matched})</span>
                                    <span className="font-bold text-red-600">{item.penalty}pts</span>
                                  </div>
                                </div>
                              ))}
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