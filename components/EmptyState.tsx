"use client"

export default function EmptyState({
  onSelect,
}: {
  onSelect: (text: string) => void
}) {
  const suggestions = [
    "二次函数最值怎么求？",
    "等差数列求和公式推导",
    "三角函数图像变换规律",
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6 mt-10 md:mt-20">
      <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl text-white shadow-md shadow-blue-500/20">
        📐
      </div>

      <div>
        <h2 className="text-[17px] font-semibold text-gray-800 mb-1.5">
          有数学题不会？问我吧
        </h2>
        <p className="text-[13px] text-gray-500 max-w-[280px] leading-relaxed">
          可以直接输入题目，也可以粘贴或上传题目图片。<br />
          我会结合一数的视频讲解来帮你解答。
        </p>
      </div>

      <div className="flex flex-col md:flex-row flex-wrap gap-2.5 justify-center mt-2 w-full max-w-md">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-[13px] bg-white border border-gray-200/80 text-gray-600 px-4 py-2.5 rounded-xl hover:border-blue-400 hover:text-blue-600 hover:shadow-sm active:scale-[0.98] transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
