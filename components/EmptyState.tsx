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
    <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-3xl text-white shadow-lg">
        📐
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          有数学题不会？问我吧
        </h2>
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
          可以直接输入题目，也可以粘贴或上传题目图片。
          <br />
          我会结合一数的视频讲解来帮你解答。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-1">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-xs bg-white border border-gray-200 text-gray-600 px-3.5 py-2 rounded-full hover:border-blue-300 hover:text-blue-600 hover:shadow-sm transition-all"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
