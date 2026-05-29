                <Tabs defaultValue="camera" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
                    <TabsTrigger value="camera" className="rounded-md">📸 Camera</TabsTrigger>
                    <TabsTrigger value="search" className="rounded-md">🔎 Search</TabsTrigger>
                    <TabsTrigger value="manual" className="rounded-md">⌨️ Manual</TabsTrigger>
                  </TabsList>

                  {/* CAMERA TAB */}
                  <TabsContent value="camera" className="space-y-4 mt-4">
                    {videoDevices.length > 0 && (
                      <div className="flex items-center gap-2">
                        <SwitchCamera className="w-4 h-4 text-gray-600 flex-shrink-0" />
                        <Select
                          value={selectedDeviceId}
                          onValueChange={(v) => switchCamera(v)}
                          disabled={ocrProcessing}
                        >
                          <SelectTrigger className="flex-1 h-9 text-xs bg-white">
                            <SelectValue placeholder="Choose a camera" />
                          </SelectTrigger>
                          <SelectContent>
                            {videoDevices.map((d, idx) => {
                              const val = d.deviceId ? d.deviceId : `cam-${idx}`;
                              return (
                                <SelectItem key={val} value={val}>
                                  {d.label || `Camera ${idx + 1}`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="relative aspect-video bg-black rounded-xl shadow-inner overflow-hidden border border-gray-200">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                      {!cameraOn && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm text-gray-500">
                          <Camera className="w-12 h-12 mb-3 text-gray-400" />
                          <p className="text-sm font-medium">Camera is off</p>
                          <p className="text-xs text-gray-400 mt-1">Start camera to scan barcodes or ingredients</p>
                        </div>
                      )}

                      {cameraOn && !ocrCameraMode && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div
                            className={`w-72 h-40 border-2 border-emerald-400 rounded-xl relative ${continuousScanning ? "animate-pulse" : ""}`}
                          >
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                              <span className="text-white text-xs font-medium bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                {continuousScanning ? <><Loader2 className="w-3 h-3 animate-spin"/> Scanning...</> : "Align barcode here"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {cameraOn && ocrCameraMode && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div className="border-2 border-blue-400 rounded-xl relative w-80 h-52">
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                              <span className="text-white text-xs font-medium bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                                <FileText className="w-3 h-3"/> OCR Mode
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {continuousScanning && scanAttempts > 0 && (
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide">
                          Attempts: {scanAttempts}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {!cameraOn ? (
                        <div className="grid grid-cols-2 gap-3">
                          <Button onClick={startCamera} className="w-full shadow-sm" size="default" disabled={ocrProcessing}>
                            <ScanBarcode className="w-4 h-4 mr-2" />
                            Scan Barcode
                          </Button>
                          <Button
                            onClick={startOCRCameraMode}
                            className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm"
                            size="default"
                            disabled={ocrProcessing}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Scan Ingredients
                          </Button>
                        </div>
                      ) : (
                        <>
                          {ocrCameraMode ? (
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                onClick={captureForOCR}
                                className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm"
                                size="default"
                                disabled={ocrProcessing}
                              >
                                {ocrProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                                {ocrProcessing ? "Processing..." : "Capture OCR"}
                              </Button>
                              <Button
                                onClick={stopCamera}
                                variant="outline"
                                className="w-full bg-white shadow-sm hover:bg-gray-50"
                                disabled={ocrProcessing}
                              >
                                Close Camera
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-3">
                              {!continuousScanning ? (
                                <Button
                                  onClick={startContinuousScan}
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                                  size="default"
                                  disabled={ocrProcessing}
                                >
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                  Start Scan
                                </Button>
                              ) : (
                                <Button
                                  onClick={stopContinuousScan}
                                  className="w-full bg-red-600 hover:bg-red-700 shadow-sm"
                                  size="default"
                                >
                                  <StopCircle className="w-4 h-4 mr-2" />
                                  Stop Scan
                                </Button>
                              )}
                              <Button onClick={stopCamera} variant="outline" size="default" className="w-full bg-white shadow-sm hover:bg-gray-50" disabled={ocrProcessing}>
                                Close Camera
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex items-center gap-4 py-2">
                        <div className="h-px flex-1 bg-gray-200"></div>
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">or upload</span>
                        <div className="h-px flex-1 bg-gray-200"></div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="secondary"
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          size="sm"
                          disabled={ocrProcessing}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Barcode Image
                        </Button>
                        <Button
                          onClick={() => ocrFileInputRef.current?.click()}
                          variant="secondary"
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                          size="sm"
                          disabled={ocrProcessing}
                        >
                          <ImagePlus className="w-4 h-4 mr-2" />
                          Ingredients Image
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  {/* SEARCH TAB */}
                  <TabsContent value="search" className="space-y-4 mt-4">
                    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                      <div className="flex flex-col space-y-1.5 mb-4">
                        <h3 className="font-semibold text-gray-900 leading-none">Database Search</h3>
                        <p className="text-sm text-gray-500">Find products without scanning. Not found? Use OCR.</p>
                      </div>
                      
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchProducts()}
                          placeholder="e.g. Kinder Joy, Maggi noodles..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all bg-gray-50 focus:bg-white"
                          disabled={searching || ocrProcessing}
                        />
                        <Button
                          onClick={searchProducts}
                          disabled={!searchQuery.trim() || searching || ocrProcessing}
                          size="default"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                          {searching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Search className="w-4 h-4 mr-1.5" />
                              Search
                            </>
                          )}
                        </Button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                          {searchResults.map((hit: any) => (
                            <div
                              key={hit.code}
                              onClick={() => pickSearchResult(hit)}
                              className="flex gap-3 p-3 bg-white border border-gray-100 rounded-lg cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all group"
                            >
                              <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                                {hit.image_small_url ? (
                                  <img
                                    src={hit.image_small_url}
                                    alt=""
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <ScanBarcode className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                                  {hit.product_name || hit.brands || "Unnamed product"}
                                </p>
                                {hit.brands && hit.product_name && (
                                  <p className="text-xs text-gray-500 truncate mt-0.5">{hit.brands}</p>
                                )}
                                <p className="text-[10px] text-gray-400 font-mono mt-1 bg-gray-50 inline-block px-1.5 py-0.5 rounded w-fit">{hit.code}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {searchPerformed && searchResults.length === 0 && !searching && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-100 rounded-lg text-sm text-orange-800 flex flex-col items-center text-center">
                          <Search className="w-8 h-8 text-orange-300 mb-2" />
                          <p className="font-semibold mb-1">No matches found</p>
                          <p className="text-orange-700/80 mb-4 text-xs">Capture the ingredients label on the back of the product to analyse it directly.</p>
                          <Button
                            onClick={() => {
                              setSearchPerformed(false)
                              startOCRCameraMode()
                            }}
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            disabled={ocrProcessing}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Open OCR Camera
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* MANUAL TAB */}
                  <TabsContent value="manual" className="space-y-4 mt-4">
                    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                      <div className="flex flex-col space-y-1.5 mb-4">
                        <h3 className="font-semibold text-gray-900 leading-none">Manual Barcode Entry</h3>
                        <p className="text-sm text-gray-500">Type the 8, 12, or 13-digit number found under the barcode.</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualBarcode}
                          onChange={(e) => setManualBarcode(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                          placeholder="e.g. 8000500310427"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono bg-gray-50 focus:bg-white transition-colors tracking-wide"
                          maxLength={14}
                          disabled={ocrProcessing}
                        />
                        <Button
                          onClick={handleManualSubmit}
                          disabled={!manualBarcode.trim() || ocrProcessing}
                          size="default"
                          className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                        >
                          Lookup
                        </Button>
                      </div>
                      <div className="mt-4 p-3 bg-purple-50/50 rounded-lg border border-purple-100 flex items-start gap-2">
                        <div className="bg-purple-100 p-1.5 rounded-md mt-0.5">
                          <ScanBarcode className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-xs text-purple-700/80 leading-relaxed">
                          Tip: The barcode number is usually located directly beneath the vertical bars. 
                          Try <span className="font-mono font-medium text-purple-800 cursor-pointer hover:underline" onClick={() => setManualBarcode("8000500310427")}>8000500310427</span> for Kinder Joy.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

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
