
import React, { useState } from 'react';
import { LifeDestinyResult } from '../types';
import { Copy, CheckCircle, AlertCircle, Upload, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import { BAZI_SYSTEM_INSTRUCTION } from '../constants';

interface ImportDataModeProps {
    onDataImport: (data: LifeDestinyResult) => void;
}

const ImportDataMode: React.FC<ImportDataModeProps> = ({ onDataImport }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [baziInfo, setBaziInfo] = useState({
        name: '',
        gender: 'Male',
        birthYear: '',
        yearPillar: '',
        monthPillar: '',
        dayPillar: '',
        hourPillar: '',
        startAge: '',
        firstDaYun: '',
    });
    const [jsonInput, setJsonInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 计算大运方向
    const getDaYunDirection = () => {
        if (!baziInfo.yearPillar) return { isForward: true, text: '顺行 (Forward)' };
        const firstChar = baziInfo.yearPillar.trim().charAt(0);
        const yangStems = ['甲', '丙', '戊', '庚', '壬'];

        const isYangYear = yangStems.includes(firstChar);
        const isForward = baziInfo.gender === 'Male' ? isYangYear : !isYangYear;

        return {
            isForward,
            text: isForward ? '順行 (Forward)' : '逆行 (Backward)'
        };
    };

    // 生成用户提示词
    const generateUserPrompt = () => {
        const { isForward, text: daYunDirectionStr } = getDaYunDirection();
        const genderStr = baziInfo.gender === 'Male' ? '男 (乾造)' : '女 (坤造)';
        const startAgeInt = parseInt(baziInfo.startAge) || 1;

        const directionExample = isForward
            ? "例如：第一步是【戊申】，第二步則是【己酉】（順排）"
            : "例如：第一步是【戊申】，第二步則是【丁未】（逆排）";

        const yearStemPolarity = (() => {
            const firstChar = baziInfo.yearPillar.trim().charAt(0);
            const yangStems = ['甲', '丙', '戊', '庚', '壬'];
            return yangStems.includes(firstChar) ? '陽' : '陰';
        })();

        return `請根據以下**已經排好的**八字四柱和**指定的大運資訊**進行分析。

【基本資訊】
性別：${genderStr}
姓名：${baziInfo.name || "未提供"}
出生年份：${baziInfo.birthYear}年 (陽曆)

【八字四柱】
年柱：${baziInfo.yearPillar} (天干屬性：${yearStemPolarity})
月柱：${baziInfo.monthPillar}
日柱：${baziInfo.dayPillar}
時柱：${baziInfo.hourPillar}

【大運核心參數】
1. 起運年齡：${baziInfo.startAge} 歲 (虛歲)。
2. 第一步大運：${baziInfo.firstDaYun}。
3. **排序方向**：${daYunDirectionStr}。

【必須執行的演算法 - 大運序列生成】
請嚴格按照以下步驟生成數據：

1. **鎖定第一步**：確認【${baziInfo.firstDaYun}】為第一步大運。
2. **計算序列**：根據六十甲子順序和方向（${daYunDirectionStr}），推算出接下來的 9 步大運。
   ${directionExample}
3. **填充 JSON**：
   - Age 1 到 ${startAgeInt - 1}: daYun = "童限"
   - Age ${startAgeInt} 到 ${startAgeInt + 9}: daYun = [第1步大運: ${baziInfo.firstDaYun}]
   - Age ${startAgeInt + 10} 到 ${startAgeInt + 19}: daYun = [第2步大運]
   - ...以此類推直到 100 歲。

【特別警告】
- **daYun 欄位**：必須填大運干支（10 年一變），**絕對不要**填流年干支。
- **ganZhi 欄位**：填入該年份的**流年干支**（每年一變，例如 2024=甲辰，2025=乙巳）。

任務：
1. 確認格局與喜忌。
2. 生成 **1-100 歲 (虛歲)** 的人生流年 K 線數據。
3. 在 \`reason\` 欄位中提供流年詳批。
4. 生成帶評分的命理分析報告（包含性格分析、幣圈交易分析、發展風水分析）。

請嚴格按照系統指令生成 JSON 數據。務必僅回傳純 JSON 格式數據，不要包含任何 Markdown 代碼塊標記或其他文字說明。`;
    };

    // 複製完整提示詞
    const copyFullPrompt = async () => {
        const fullPrompt = `=== 系統指令 (System Prompt) ===\n\n${BAZI_SYSTEM_INSTRUCTION}\n\n=== 用戶提示詞 (User Prompt) ===\n\n${generateUserPrompt()}`;

        try {
            await navigator.clipboard.writeText(fullPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('複製失敗', err);
        }
    };

    // 解析導入的 JSON
    const handleImport = () => {
        setError(null);

        if (!jsonInput.trim()) {
            setError('請貼上 AI 回傳的 JSON 數據');
            return;
        }

        try {
            // 嘗試從可能包含 markdown 的內容中提取 JSON
            let jsonContent = jsonInput.trim();

            // 提取 ```json ... ``` 中的內容
            const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonContent = jsonMatch[1].trim();
            } else {
                // 嘗試找到 JSON 對象
                const jsonStartIndex = jsonContent.indexOf('{');
                const jsonEndIndex = jsonContent.lastIndexOf('}');
                if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                    jsonContent = jsonContent.substring(jsonStartIndex, jsonEndIndex + 1);
                }
            }

            const data = JSON.parse(jsonContent);

            // 校驗數據
            if (!data.chartPoints || !Array.isArray(data.chartPoints)) {
                throw new Error('數據格式不正確：缺少 chartPoints 陣列');
            }

            if (data.chartPoints.length < 10) {
                throw new Error('數據不完整：chartPoints 數量太少');
            }

            // 轉換為應用所需格式
            const result: LifeDestinyResult = {
                chartData: data.chartPoints,
                analysis: {
                    bazi: data.bazi || [],
                    summary: data.summary || "無摘要",
                    summaryScore: data.summaryScore || 5,
                    personality: data.personality || "無性格分析",
                    personalityScore: data.personalityScore || 5,
                    industry: data.industry || "無",
                    industryScore: data.industryScore || 5,
                    fengShui: data.fengShui || "建議多親近自然，保持心境平和。",
                    fengShuiScore: data.fengShuiScore || 5,
                    wealth: data.wealth || "無",
                    wealthScore: data.wealthScore || 5,
                    marriage: data.marriage || "無",
                    marriageScore: data.marriageScore || 5,
                    health: data.health || "無",
                    healthScore: data.healthScore || 5,
                    family: data.family || "無",
                    familyScore: data.familyScore || 5,
                    crypto: data.crypto || "暫無交易分析",
                    cryptoScore: data.cryptoScore || 5,
                    cryptoYear: data.cryptoYear || "待定",
                    cryptoStyle: data.cryptoStyle || "現貨定投",
                },
            };

            onDataImport(result);
        } catch (err: any) {
            setError(`解析失敗：${err.message}`);
        }
    };

    const handleBaziChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setBaziInfo(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const isStep1Valid = baziInfo.birthYear && baziInfo.yearPillar && baziInfo.monthPillar &&
        baziInfo.dayPillar && baziInfo.hourPillar && baziInfo.startAge && baziInfo.firstDaYun;

    return (
        <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            {/* 步驟指示器 */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <React.Fragment key={s}>
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === s
                                ? 'bg-indigo-600 text-white scale-110'
                                : step > s
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-500'
                                }`}
                        >
                            {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                        </div>
                        {s < 3 && <div className={`w-16 h-1 rounded ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
                    </React.Fragment>
                ))}
            </div>

            {/* 步驟 1: 輸入八字資訊 */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">第一步：輸入八字資訊</h2>
                        <p className="text-gray-500 text-sm">填寫您的四柱與大運資訊</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">姓名 (選填)</label>
                            <input
                                type="text"
                                name="name"
                                value={baziInfo.name}
                                onChange={handleBaziChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="姓名"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">性別</label>
                            <select
                                name="gender"
                                value={baziInfo.gender}
                                onChange={handleBaziChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="Male">乾造 (男)</option>
                                <option value="Female">坤造 (女)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                        <div className="flex items-center gap-2 mb-3 text-amber-800 text-sm font-bold">
                            <Sparkles className="w-4 h-4" />
                            <span>四柱干支</span>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-1">出生年份 (陽曆)</label>
                            <input
                                type="number"
                                name="birthYear"
                                value={baziInfo.birthYear}
                                onChange={handleBaziChange}
                                placeholder="如: 2003"
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            {(['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'] as const).map((field, i) => (
                                <div key={field}>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">{['年柱', '月柱', '日柱', '時柱'][i]}</label>
                                    <input
                                        type="text"
                                        name={field}
                                        value={baziInfo[field]}
                                        onChange={handleBaziChange}
                                        placeholder={['甲子', '乙丑', '丙寅', '丁卯'][i]}
                                        className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-center font-serif-sc font-bold"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">起運年齡 (虛歲)</label>
                                <input
                                    type="number"
                                    name="startAge"
                                    value={baziInfo.startAge}
                                    onChange={handleBaziChange}
                                    placeholder="如: 8"
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">第一步大運</label>
                                <input
                                    type="text"
                                    name="firstDaYun"
                                    value={baziInfo.firstDaYun}
                                    onChange={handleBaziChange}
                                    placeholder="如: 辛酉"
                                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-center font-serif-sc font-bold"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-indigo-600/70 mt-2 text-center">
                            大運方向：<span className="font-bold text-indigo-900">{getDaYunDirection().text}</span>
                        </p>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        disabled={!isStep1Valid}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        下一步：生成提示詞 <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* 步驟 2: 複製提示詞 */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">第二步：複製提示詞</h2>
                        <p className="text-gray-500 text-sm">將提示詞貼到任意 AI 聊天工具</p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                            <div>
                                <h3 className="font-bold text-gray-800">支援的 AI 工具</h3>
                                <p className="text-sm text-gray-600">ChatGPT、Claude、Gemini、通義千問、文心一言等</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-200 max-h-64 overflow-y-auto mb-4">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                {generateUserPrompt().substring(0, 500)}...
                            </pre>
                        </div>

                        <button
                            onClick={copyFullPrompt}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${copied
                                ? 'bg-green-500 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle className="w-5 h-5" />
                                    已複製到剪貼板！
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    複製完整提示詞
                                </>
                            )}
                        </button>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                        <h4 className="font-bold text-amber-800 mb-2">📝 使用說明</h4>
                        <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                            <li>點擊上方按鈕複製提示詞</li>
                            <li>打開任意 AI 聊天工具（如 ChatGPT）</li>
                            <li>貼上提示詞並發送</li>
                            <li>等待 AI 生成完整的 JSON 數據</li>
                            <li>複製 AI 的回覆，回到這裡進行下一步</li>
                        </ol>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(1)}
                            className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            ← 上一步
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            下一步：匯入數據 <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* 步驟 3: 導入 JSON */}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold font-serif-sc text-gray-800 mb-2">第三步：匯入 AI 回覆</h2>
                        <p className="text-gray-500 text-sm">貼上 AI 回傳的 JSON 數據</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            <Upload className="w-4 h-4 inline mr-2" />
                            貼上 AI 回傳的 JSON 數據
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            placeholder='將 AI 回傳的 JSON 數據貼到這裡...&#10;&#10;例如:&#10;{&#10;  "bazi": ["癸未", "壬戌", "丙子", "庚寅"],&#10;  "chartPoints": [...],&#10;  ...&#10;}'
                            className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs resize-none"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-3 rounded-xl font-bold border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                        >
                            ← 上一步
                        </button>
                        <button
                            onClick={handleImport}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5" />
                            生成人生 K 線
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportDataMode;
