import { useParams } from "react-router-dom"
import QRCode from "react-qr-code"
import { useGem } from "@/hooks/useGemStore"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { ImageIcon } from "lucide-react"

export function ReportPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const { gems } = useGem()
  const gem = gems.find((g) => g._id === id)

  if (!gem) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-slate-50'>
        <p className='text-slate-500'>Report not found or invalid ID.</p>
      </div>
    )
  }

  const finalData = gem.finalApproval
  const obs = finalData?.finalObservations || {}

  // Construct a verification URL (assuming the app is hosted)
  // For local dev, it's window.location.href or similar
  // In production, it would be https://gem-tracker.com/verify/${id}
  const verificationUrl = `${window.location.origin}/reports/${id}`

  return (
    <div className='min-h-screen bg-slate-100 py-10 px-4 flex justify-center'>
      <Card className='w-full max-w-4xl bg-white shadow-xl overflow-hidden print:shadow-none print:w-full'>
        {/* Header */}
        <div className='bg-slate-900 text-white p-8 flex justify-between items-center'>
          <div>
            <h1 className='text-3xl font-serif font-bold tracking-wider mb-2'>GEM REPORT</h1>
            <p className='text-slate-400 text-sm tracking-widest uppercase'>
              Official Laboratory Certification
            </p>
          </div>
          <div className='text-right'>
            <p className='text-2xl font-mono font-bold text-emerald-400'>{gem.gemId}</p>
            <p className='text-xs text-slate-400 mt-1'>{new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Content */}
        <div className='p-10 grid grid-cols-1 md:grid-cols-3 gap-10'>
          {/* Left Column: Image & Authenticity */}
          <div className='md:col-span-1 space-y-8'>
            <div className='aspect-square overflow-hidden bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shadow-inner'>
              {gem.imageUrl ? (
                <img
                  src={`${api.BASE_URL}${gem.imageUrl}`}
                  alt={gem.gemId}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='text-center'>
                  <ImageIcon className='w-12 h-12 mx-auto text-slate-200 mb-2' />
                  <span className='text-[10px] font-bold text-slate-300 uppercase tracking-widest'>
                    No Image Available
                  </span>
                </div>
              )}
            </div>

            <div className='text-center space-y-4'>
              <div className='p-4 border border-slate-200 rounded-xl bg-slate-50'>
                <p className='text-[10px] font-bold text-slate-400 uppercase mb-2'>
                  Scan to Verify
                </p>
                <div className='bg-white p-2 inline-block rounded shadow-sm'>
                  <QRCode value={verificationUrl} size={120} />
                </div>
                <p className='text-[10px] text-slate-400 mt-2 break-all font-mono'>{id}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Details */}
          <div className='md:col-span-2 space-y-8'>
            {/* Main Identification */}
            <div className='border-b border-slate-100 pb-8'>
              <div className='flex items-center gap-4 mb-4'>
                <Badge className='bg-emerald-600 hover:bg-emerald-700 text-base py-1 px-4'>
                  {finalData?.finalVariety || "Unknown Variety"}
                </Badge>
                <span className='text-xl text-slate-700 italic font-serif'>
                  {obs.species || "Unknown Species"}
                </span>
              </div>
              <p className='text-slate-600 leading-relaxed italic'>
                "{finalData?.itemDescription || gem.itemDescription}"
              </p>
            </div>

            {/* Technical Specs */}
            <div className='grid grid-cols-2 gap-y-6 gap-x-10'>
              <div>
                <p className='text-xs font-bold text-slate-400 uppercase mb-1'>Details</p>
                <ul className='space-y-2 text-sm text-slate-700'>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Color</span>
                    <span className='font-bold'>{gem.color}</span>
                  </li>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Shape</span>
                    <span className='font-bold'>{obs.shape || "-"}</span>
                  </li>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Cut</span>
                    <span className='font-bold'>{obs.cut || "-"}</span>
                  </li>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Transparency</span>
                    <span className='font-bold'>{obs.transparency || "-"}</span>
                  </li>
                </ul>
              </div>

              <div>
                <p className='text-xs font-bold text-slate-400 uppercase mb-1'>Measurements</p>
                <ul className='space-y-2 text-sm text-slate-700'>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Weight (Total)</span>
                    <span className='font-bold'>{gem.totalArticleWeight} g</span>
                  </li>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Dimensions</span>
                    <span className='font-bold'>{obs.stone || "-"} mm</span>
                  </li>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Refractive Index</span>
                    <span className='font-bold'>{finalData?.ri || "-"}</span>
                  </li>
                  <li className='flex justify-between border-b border-slate-50 pb-1'>
                    <span>Specific Gravity</span>
                    <span className='font-bold'>{finalData?.sg || "-"}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Origin & Grading */}
            <div className='bg-slate-50 p-6 rounded-xl border border-slate-100'>
              <div className='grid grid-cols-2 gap-6'>
                <div>
                  <p className='text-[10px] font-bold text-slate-400 uppercase mb-1'>Origin</p>
                  <p className='text-lg font-bold text-slate-800'>
                    {obs.origin || "Not Specified"}
                  </p>
                </div>
                <div>
                  <p className='text-[10px] font-bold text-slate-400 uppercase mb-1'>Hardness</p>
                  <p className='text-lg font-bold text-slate-800'>{finalData?.hardness || "-"}</p>
                </div>
              </div>
            </div>

            {/* Footer / Notes */}
            <div className='pt-4'>
              <p className='text-[10px] text-slate-400'>
                This report is for identification purposes only. The results are based on the
                scientific measurements available at the time of testing.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Print Button Wrapper */}
      <div className='fixed bottom-8 right-8 print:hidden'>
        <button
          onClick={() => window.print()}
          className='bg-slate-900 text-white p-4 rounded-full shadow-lg hover:bg-slate-800 transition-all'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <polyline points='6 9 6 2 18 2 18 9'></polyline>
            <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'></path>
            <rect x='6' y='14' width='12' height='8'></rect>
          </svg>
        </button>
      </div>

      <style>{`
        @media print {
          @page { margin: 0; }
          body { background: white; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none; }
          .print\\:shadow-none { box-shadow: none; }
          .print\\:w-full { width: 100%; max-width: none; }
        }
      `}</style>
    </div>
  )
}
