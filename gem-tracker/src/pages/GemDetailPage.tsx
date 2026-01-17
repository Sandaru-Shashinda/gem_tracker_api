import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Microscope, Search, ArrowLeft, ShieldCheck } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useGem } from "@/hooks/useGemStore"
import { GEM_REFERENCES, PREDEFINED_SPECIES } from "@/lib/constants"
import type { GemStatus } from "@/lib/types"

export function GemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, gems, handleTestSubmit, handleApproval, handleOverride } = useGem()
  const navigate = useNavigate()

  const gem = gems.find((g) => g._id === id)

  const [formData, setFormData] = useState({
    ri: "",
    sg: "",
    hardness: "",
    shape: "",
    cut: "",
    clusterSize: "",
    stoneSize: "",
    transparency: "",
    origin: "",
    cuttingGrade: "Fine",
    polishingGrade: "Fine",
    proportionGrade: "Fine",
    clarityGrade: "Fine",
    species: "",
    selectedVariety: "",
    notes: "",
    comments: "",
  })

  const [speciesSearch, setSpeciesSearch] = useState("")
  const [showSpeciesList, setShowSpeciesList] = useState(false)

  const filteredSpecies = PREDEFINED_SPECIES.filter((s) =>
    s.toLowerCase().includes(speciesSearch.toLowerCase()),
  )

  const isT1 = gem?.status === "READY_FOR_T1"
  const isT2 = gem?.status === "READY_FOR_T2"
  const isApproval = gem?.status === "READY_FOR_APPROVAL"

  useEffect(() => {
    if (gem) {
      const activeData = isT1 ? gem.test1 : isT2 ? gem.test2 : gem.finalApproval
      if (activeData) {
        setFormData((prev) => ({
          ...prev,
          ri: activeData.ri?.toString() || "",
          sg: activeData.sg?.toString() || "",
          hardness: activeData.hardness?.toString() || "",
        }))
        const obs = (activeData as any).observations || (activeData as any).finalObservations
        if (obs?.species) {
          setSpeciesSearch(obs.species)
        }
      }
    }
  }, [gem, isT1, isT2])

  // Auto-suggestion Logic
  useEffect(() => {
    if (formData.ri || formData.sg) {
      const ri = parseFloat(formData.ri)
      const sg = parseFloat(formData.sg)

      const matches = GEM_REFERENCES.filter((ref) => {
        let matchScore = 0
        if (ri && ri >= ref.riMin - 0.05 && ri <= ref.riMax + 0.05) matchScore++
        if (sg && sg >= ref.sgMin - 0.2 && sg <= ref.sgMax + 0.2) matchScore++
        return matchScore > 0
      })
      console.log("Suggestions:", matches)
    }
  }, [formData.ri, formData.sg])

  if (!gem) {
    return (
      <MainLayout>
        <div className='text-center py-20'>
          <h2 className='text-2xl font-bold text-slate-800'>Gem not found</h2>
          <Button onClick={() => navigate("/queue")} className='mt-4'>
            Back to Queue
          </Button>
        </div>
      </MainLayout>
    )
  }

  const canTest = user?.role === "TESTER" || user?.role === "ADMIN"
  const canApprove = user?.role === "FINAL_APPROVER" || user?.role === "ADMIN"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isApproval && canApprove) {
      handleApproval(gem._id, { ...formData })
      navigate("/queue")
    } else if (canTest) {
      handleTestSubmit(gem._id, isT1 ? "test1" : "test2", formData)
      navigate("/queue")
    }
  }

  const copyValues = (source: any) => {
    const obs = source.observations || source.finalObservations || {}
    setFormData({
      ri: source.ri?.toString() || "",
      sg: source.sg?.toString() || "",
      hardness: source.hardness?.toString() || "",
      shape: obs.shape || "",
      cut: obs.cut || "",
      clusterSize: obs.cluster || "",
      stoneSize: obs.stone || "",
      transparency: obs.transparency || "",
      origin: obs.origin || "",
      cuttingGrade: obs.cuttingGrade || "Fine",
      polishingGrade: obs.polishingGrade || "Fine",
      proportionGrade: obs.proportionGrade || "Fine",
      clarityGrade: obs.clarityGrade || "Fine",
      species: obs.species || "",
      selectedVariety: source.selectedVariety || source.finalVariety || obs.variety || "",
      notes: source.notes || "",
      comments: obs.comments || "",
    })
  }

  const getStatusVariant = (status: GemStatus) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "READY_FOR_APPROVAL":
        return "outline"
      default:
        return "secondary"
    }
  }

  return (
    <MainLayout>
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <Button variant='outline' size='icon' onClick={() => navigate(-1)}>
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <div>
              <h2 className='text-2xl font-bold text-slate-800'>Processing: {gem.gemId}</h2>
              <p className='text-sm text-slate-500'>
                Updated: {new Date(gem.updatedAt).toLocaleString()}
              </p>
            </div>
            <Badge variant={getStatusVariant(gem.status)}>{gem.status.replace(/_/g, " ")}</Badge>
          </div>
          {gem.status === "COMPLETED" && gem.finalApproval.reportUrl && (
            <Button
              variant='default'
              className='bg-emerald-600 hover:bg-emerald-700'
              onClick={() => window.open(`http://localhost:5000${gem.finalApproval.reportUrl}`)}
            >
              View PDF Report
            </Button>
          )}
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
          {/* Left Column: Intake & History */}
          <div className='lg:col-span-1 space-y-6'>
            <Card className='p-5 bg-slate-50 border-slate-200'>
              <h3 className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-4'>
                Intake Details
              </h3>
              <div className='space-y-3 text-sm'>
                <div className='flex justify-between border-b border-slate-200 pb-1'>
                  <span className='text-slate-500'>Color:</span>{" "}
                  <span className='font-bold'>{gem.color}</span>
                </div>
                <div className='flex justify-between border-b border-slate-200 pb-1'>
                  <span className='text-slate-500'>Emerald Wt:</span>{" "}
                  <span className='font-bold'>{gem.emeraldWeight} ct</span>
                </div>
                <div className='flex justify-between border-b border-slate-200 pb-1'>
                  <span className='text-slate-500'>Diamond Wt:</span>{" "}
                  <span className='font-bold'>{gem.diamondWeight} ct</span>
                </div>
                <div className='flex justify-between border-b border-slate-200 pb-1'>
                  <span className='text-slate-500'>Article Wt:</span>{" "}
                  <span className='font-bold'>{gem.totalArticleWeight} g</span>
                </div>
                <div className='pt-2'>
                  <p className='text-[10px] uppercase font-bold text-slate-400 mb-1'>Description</p>
                  <p className='text-xs text-slate-600 leading-relaxed'>{gem.itemDescription}</p>
                </div>
              </div>
            </Card>

            {/* Historical Blocks */}
            {(gem.test1?.ri || gem.test2?.ri) && (
              <div className='space-y-4'>
                {gem.test1?.ri && (
                  <Card className='p-4 border-l-4 border-l-blue-500 shadow-sm'>
                    <div className='flex justify-between items-center mb-2'>
                      <span className='text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded'>
                        TESTER 1
                      </span>
                      {isApproval && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 text-[10px]'
                          onClick={() => copyValues(gem.test1)}
                        >
                          Copy Data
                        </Button>
                      )}
                    </div>
                    <div className='text-xs space-y-1'>
                      <p>
                        RI: <strong>{gem.test1.ri}</strong> | SG: <strong>{gem.test1.sg}</strong>
                      </p>
                      <p>
                        Var: <strong>{gem.test1.selectedVariety}</strong>
                      </p>
                    </div>
                  </Card>
                )}
                {gem.test2?.ri && (
                  <Card className='p-4 border-l-4 border-l-purple-500 shadow-sm'>
                    <div className='flex justify-between items-center mb-2'>
                      <span className='text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded'>
                        TESTER 2
                      </span>
                      {isApproval && (
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 text-[10px]'
                          onClick={() => copyValues(gem.test2)}
                        >
                          Copy Data
                        </Button>
                      )}
                    </div>
                    <div className='text-xs space-y-1'>
                      <p>
                        RI: <strong>{gem.test2.ri}</strong> | SG: <strong>{gem.test2.sg}</strong>
                      </p>
                      <p>
                        Var: <strong>{gem.test2.selectedVariety}</strong>
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Main Column */}
          <div className='lg:col-span-3'>
            {((isT1 || isT2) && canTest) || (isApproval && canApprove) ? (
              <Card className='p-6'>
                <form onSubmit={handleSubmit} className='space-y-8'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    <div className='space-y-6'>
                      <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2'>
                        <Microscope size={18} className='text-blue-600' /> Scientific Measurements
                      </h3>

                      <div className='grid grid-cols-3 gap-4'>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>R.I.</label>
                          <Input
                            type='number'
                            step='0.001'
                            value={formData.ri}
                            onChange={(e) => setFormData({ ...formData, ri: e.target.value })}
                            required
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>S.G.</label>
                          <Input
                            type='number'
                            step='0.01'
                            value={formData.sg}
                            onChange={(e) => setFormData({ ...formData, sg: e.target.value })}
                            required
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Hardness
                          </label>
                          <Input
                            type='number'
                            step='0.5'
                            value={formData.hardness}
                            onChange={(e) => setFormData({ ...formData, hardness: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Shape
                          </label>
                          <Input
                            placeholder='e.g. Oval Cabochon'
                            value={formData.shape}
                            onChange={(e) => setFormData({ ...formData, shape: e.target.value })}
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>Cut</label>
                          <Input
                            placeholder='e.g. Cabochon Cut'
                            value={formData.cut}
                            onChange={(e) => setFormData({ ...formData, cut: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-bold text-slate-500 uppercase'>
                          Transparency
                        </label>
                        <Input
                          placeholder='e.g. Transparent'
                          value={formData.transparency}
                          onChange={(e) =>
                            setFormData({ ...formData, transparency: e.target.value })
                          }
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Cluster Size (mm)
                          </label>
                          <Input
                            placeholder='20.88 x 19.05...'
                            value={formData.clusterSize}
                            onChange={(e) =>
                              setFormData({ ...formData, clusterSize: e.target.value })
                            }
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Stone Size (mm)
                          </label>
                          <Input
                            placeholder='14.25 x 12.25...'
                            value={formData.stoneSize}
                            onChange={(e) =>
                              setFormData({ ...formData, stoneSize: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className='space-y-6'>
                      <h3 className='font-bold text-slate-900 flex items-center gap-2 border-b pb-2'>
                        <Search size={18} className='text-amber-600' /> Identification & Grading
                      </h3>

                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1.5 relative'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Species
                          </label>
                          <Input
                            placeholder='Type to search species...'
                            value={speciesSearch}
                            onChange={(e) => {
                              setSpeciesSearch(e.target.value)
                              setShowSpeciesList(true)
                              setFormData({ ...formData, species: e.target.value })
                            }}
                            onFocus={() => setShowSpeciesList(true)}
                          />
                          {showSpeciesList && filteredSpecies.length > 0 && (
                            <div className='absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto overflow-x-hidden'>
                              {filteredSpecies.map((s, i) => (
                                <button
                                  key={i}
                                  type='button'
                                  className='w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors border-b last:border-0 border-slate-100'
                                  onClick={() => {
                                    setFormData({ ...formData, species: s })
                                    setSpeciesSearch(s)
                                    setShowSpeciesList(false)
                                  }}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          )}
                          {showSpeciesList && (
                            <div
                              className='fixed inset-0 z-40'
                              onClick={() => setShowSpeciesList(false)}
                            ></div>
                          )}
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Variety
                          </label>
                          <select
                            className='w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm'
                            value={formData.selectedVariety}
                            onChange={(e) =>
                              setFormData({ ...formData, selectedVariety: e.target.value })
                            }
                            required
                          >
                            <option value=''>Select Variety...</option>
                            {GEM_REFERENCES.map((g, i) => (
                              <option key={i} value={g.variety}>
                                {g.variety}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Origin
                          </label>
                          <Input
                            placeholder='Colombia'
                            value={formData.origin}
                            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Cutting
                          </label>
                          <select
                            className='w-full px-3 py-2 border border-slate-300 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500 outline-none bg-white'
                            value={formData.cuttingGrade}
                            onChange={(e) =>
                              setFormData({ ...formData, cuttingGrade: e.target.value })
                            }
                          >
                            <option>Fine</option>
                            <option>Good</option>
                            <option>Fair</option>
                            <option>Poor</option>
                          </select>
                        </div>
                      </div>

                      <div className='grid grid-cols-3 gap-3'>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Polishing
                          </label>
                          <select
                            className='w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none bg-white'
                            value={formData.polishingGrade}
                            onChange={(e) =>
                              setFormData({ ...formData, polishingGrade: e.target.value })
                            }
                          >
                            <option>Fine</option>
                            <option>Good</option>
                          </select>
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Proportion
                          </label>
                          <select
                            className='w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none bg-white'
                            value={formData.proportionGrade}
                            onChange={(e) =>
                              setFormData({ ...formData, proportionGrade: e.target.value })
                            }
                          >
                            <option>Fine</option>
                            <option>Good</option>
                          </select>
                        </div>
                        <div className='space-y-1.5'>
                          <label className='text-xs font-bold text-slate-500 uppercase'>
                            Clarity
                          </label>
                          <select
                            className='w-full px-2 py-1.5 border border-slate-300 rounded text-xs outline-none bg-white'
                            value={formData.clarityGrade}
                            onChange={(e) =>
                              setFormData({ ...formData, clarityGrade: e.target.value })
                            }
                          >
                            <option>Fine</option>
                            <option>Good</option>
                          </select>
                        </div>
                      </div>

                      <div className='space-y-1.5'>
                        <label className='text-xs font-bold text-slate-500 uppercase'>Notes</label>
                        <Textarea
                          placeholder='Analysis notes, observations, etc.'
                          value={formData.comments}
                          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                          className='min-h-[80px]'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='flex gap-4 pt-4 border-t'>
                    <Button
                      type='submit'
                      className='flex-1 h-12 text-lg font-bold'
                      variant={isApproval ? "default" : "secondary"}
                    >
                      {isApproval ? "Finalize Certificate" : "Submit Lab Analysis"}
                    </Button>

                    {user?.role === "ADMIN" && (
                      <div className='flex items-center gap-2 bg-red-50 px-4 rounded-lg border border-red-100'>
                        <ShieldCheck size={16} className='text-red-600' />
                        <select
                          className='text-xs bg-transparent text-red-800 outline-none font-bold cursor-pointer'
                          value={gem.status}
                          onChange={(e) => handleOverride(gem._id, e.target.value)}
                        >
                          <option value='READY_FOR_T1'>RST T1</option>
                          <option value='READY_FOR_T2'>RST T2</option>
                          <option value='READY_FOR_APPROVAL'>RST APP</option>
                          <option value='COMPLETED'>DONE</option>
                        </select>
                      </div>
                    )}
                  </div>
                </form>
              </Card>
            ) : gem.status === "COMPLETED" && user?.role === "ADMIN" ? (
              <div className='space-y-6'>
                <Card className='p-8 border-l-4 border-l-emerald-500 shadow-md'>
                  <div className='flex items-center justify-between mb-8'>
                    <div className='flex items-center gap-3'>
                      <div className='w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center'>
                        <ShieldCheck className='text-emerald-600' size={24} />
                      </div>
                      <div>
                        <h3 className='text-xl font-bold text-slate-900'>Final Technical Audit</h3>
                        <p className='text-sm text-slate-500'>Verified Laboratory Record</p>
                      </div>
                    </div>
                    <Badge
                      variant='outline'
                      className='px-4 py-1 text-emerald-700 bg-emerald-50 border-emerald-200'
                    >
                      Official Certificate Data
                    </Badge>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-10'>
                    <div className='space-y-8'>
                      <div>
                        <h4 className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2 flex justify-between'>
                          Laboratory Measurements <span>[METRIC]</span>
                        </h4>
                        <div className='grid grid-cols-3 gap-3'>
                          <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
                            <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                              R.I.
                            </p>
                            <p className='text-base font-black text-slate-800'>
                              {gem.finalApproval.ri || "N/A"}
                            </p>
                          </div>
                          <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
                            <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                              S.G.
                            </p>
                            <p className='text-base font-black text-slate-800'>
                              {gem.finalApproval.sg || "N/A"}
                            </p>
                          </div>
                          <div className='p-4 bg-slate-50 rounded-xl border border-slate-100'>
                            <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                              Hardness
                            </p>
                            <p className='text-base font-black text-slate-800'>
                              {gem.finalApproval.hardness || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm'>
                        <div className='flex justify-between items-center text-sm'>
                          <span className='font-bold text-slate-500 italic'>Shape:</span>
                          <span className='font-black text-slate-800 bg-slate-50 px-3 py-1 rounded'>
                            {gem.finalApproval.finalObservations?.shape}
                          </span>
                        </div>
                        <div className='flex justify-between items-center text-sm'>
                          <span className='font-bold text-slate-500 italic'>Cut:</span>
                          <span className='font-black text-slate-800 bg-slate-50 px-3 py-1 rounded'>
                            {gem.finalApproval.finalObservations?.cut}
                          </span>
                        </div>
                        <div className='flex justify-between items-center text-sm'>
                          <span className='font-bold text-slate-500 italic'>Transparency:</span>
                          <span className='font-black text-slate-800'>
                            {gem.finalApproval.finalObservations?.transparency}
                          </span>
                        </div>
                        <div className='pt-2 grid grid-cols-2 gap-4'>
                          <div>
                            <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                              Cluster Size
                            </p>
                            <p className='text-xs font-bold text-slate-800'>
                              {gem.finalApproval.finalObservations?.cluster} mm
                            </p>
                          </div>
                          <div>
                            <p className='text-[9px] font-bold text-slate-400 uppercase mb-1'>
                              Stone Size
                            </p>
                            <p className='text-xs font-bold text-slate-800'>
                              {gem.finalApproval.finalObservations?.stone} mm
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className='space-y-8'>
                      <div>
                        <h4 className='text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2'>
                          Authenticity & Grading
                        </h4>
                        <div className='p-6 bg-emerald-950 rounded-2xl shadow-xl shadow-emerald-900/10 mb-6'>
                          <div className='flex justify-between items-center mb-4'>
                            <span className='text-[10px] font-bold text-emerald-400 uppercase'>
                              Variety
                            </span>
                            <Badge className='bg-emerald-500 text-white border-0 text-xs py-1 px-4'>
                              {gem.finalApproval.finalVariety}
                            </Badge>
                          </div>
                          <div className='flex justify-between items-center'>
                            <span className='text-[10px] font-bold text-emerald-400 uppercase'>
                              Geographic Origin
                            </span>
                            <span className='text-sm font-black text-white italic'>
                              {gem.finalApproval.finalObservations?.origin}
                            </span>
                          </div>
                        </div>

                        <div className='grid grid-cols-2 gap-3'>
                          {[
                            { label: "Cutting", key: "cuttingGrade" },
                            { label: "Polishing", key: "polishingGrade" },
                            { label: "Proportion", key: "proportionGrade" },
                            { label: "Clarity", key: "clarityGrade" },
                          ].map((item) => (
                            <div
                              key={item.key}
                              className='p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center text-center'
                            >
                              <p className='text-[9px] font-black text-slate-400 uppercase mb-2'>
                                {item.label}
                              </p>
                              <p className='text-sm font-black text-emerald-600 italic'>
                                {(gem.finalApproval.finalObservations as any)?.[item.key] || "Fine"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='mt-10 p-6 bg-slate-900 rounded-2xl relative overflow-hidden'>
                    <div className='absolute top-0 right-0 w-32 h-32 bg-slate-800/50 rounded-full blur-3xl -mr-16 -mt-16'></div>
                    <p className='text-[10px] uppercase font-black text-slate-500 mb-3 tracking-widest relative z-10'>
                      Item Description (Permanent Record)
                    </p>
                    <p className='text-base text-slate-300 leading-relaxed font-light relative z-10 italic'>
                      "{gem.finalApproval.itemDescription}"
                    </p>
                  </div>

                  <div className='mt-8 pt-8 border-t border-slate-100 flex justify-end gap-3'>
                    <Button
                      variant='outline'
                      className='mr-auto'
                      onClick={() =>
                        window.open(`http://localhost:5000${gem.finalApproval.reportUrl}`)
                      }
                    >
                      View PDF
                    </Button>
                    <div className='flex items-center gap-2 bg-red-50 px-5 py-2.5 rounded-xl border border-red-100'>
                      <ShieldCheck size={18} className='text-red-600' />
                      <span className='text-[10px] font-black text-red-800 mr-2'>
                        SYSTEM OVERRIDE
                      </span>
                      <select
                        className='text-xs bg-transparent text-red-800 outline-none font-black cursor-pointer'
                        value={gem.status}
                        onChange={(e) => handleOverride(gem._id, e.target.value)}
                      >
                        <option value='READY_FOR_T1'>RST T1</option>
                        <option value='READY_FOR_T2'>RST T2</option>
                        <option value='READY_FOR_APPROVAL'>RST APP</option>
                        <option value='COMPLETED'>DONE</option>
                      </select>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className='h-full min-h-[500px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm'>
                <div className='w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6'>
                  <Microscope className='text-slate-300' size={40} />
                </div>
                <h3 className='text-xl font-bold text-slate-800 mb-2'>
                  {gem.status === "COMPLETED" ? "Workflow Finalized" : "Pending Next Stage"}
                </h3>
                <p className='text-slate-500 text-center max-w-sm'>
                  {gem.status === "COMPLETED"
                    ? "The scientific analysis is complete. You can view or print the official certificate above."
                    : `This record is currently in ${gem.status}. Please wait for the assigned staff to complete their tasks.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
