'use client'

export default function FrontWall() {
  return (
    <div
      className="relative w-full h-16 flex items-center rounded-t-md overflow-hidden mb-2 shrink-0"
      style={{ background: 'linear-gradient(135deg, #1C2B4A, #243560)' }}
    >
      {/* Door left of Aron Kodesh */}
      <div
        className="absolute flex flex-col items-center text-white text-xs"
        style={{ left: '38%', transform: 'translateX(-50%)' }}
      >
        <span className="text-2xl leading-none">🚪</span>
        <span className="text-[10px] text-blue-200 font-sans mt-0.5">Door</span>
      </div>

      {/* Aron Kodesh */}
      <div
        className="absolute flex flex-col items-center justify-center px-4 py-1 rounded"
        style={{
          left: '52%',
          transform: 'translateX(-50%)',
          border: '2px solid #C8A830',
          background: 'rgba(200,168,48,0.12)',
          minWidth: 120,
        }}
      >
        <span className="font-garamond text-yellow-300 text-lg leading-tight">ארון קודש</span>
        <span className="font-garamond text-yellow-200 text-xs tracking-widest">ARON KODESH</span>
      </div>

      {/* Front label */}
      <div className="absolute right-4 text-blue-300 text-xs font-sans opacity-70 tracking-widest uppercase">
        Front
      </div>
    </div>
  )
}
