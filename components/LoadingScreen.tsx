"use client"

import { useEffect, useState } from 'react'
import { GraduationCap, Atom, Calculator, FlaskConical, BookOpen, Microscope } from 'lucide-react'

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0)
  const [currentSubject, setCurrentSubject] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  const subjects = [
    { icon: Calculator, name: "Mathematics", color: "text-blue-500", bgColor: "bg-blue-100 dark:bg-blue-900" },
    { icon: Atom, name: "Physics", color: "text-green-500", bgColor: "bg-green-100 dark:bg-green-900" },
    { icon: FlaskConical, name: "Chemistry", color: "text-purple-500", bgColor: "bg-purple-100 dark:bg-purple-900" },
    { icon: Microscope, name: "Biology", color: "text-emerald-500", bgColor: "bg-emerald-100 dark:bg-emerald-900" },
  ]

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100
        return prev + 2
      })
    }, 60)

    const subjectTimer = setInterval(() => {
      setCurrentSubject(prev => (prev + 1) % subjects.length)
    }, 800)

    return () => {
      window.removeEventListener('resize', checkMobile)
      clearInterval(timer)
      clearInterval(subjectTimer)
    }
  }, [])

  const CurrentIcon = subjects[currentSubject].icon

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center z-50">
      <div className="text-center space-y-6 sm:space-y-8 max-w-xs sm:max-w-md mx-auto px-4 sm:px-6">
        {/* Main Logo with Pulse Animation */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-blue-400/20 rounded-full"></div>
          </div>
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gray-800 rounded-full shadow-lg flex items-center justify-center border-3 sm:border-4 border-blue-700">
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 animate-bounce" />
          </div>
        </div>

        {/* Brand Name */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            Cosine <span className="text-blue-400">classes</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-medium">
            by Debabrata Mahanta
          </p>
        </div>

        {/* Floating Subject Icons */}
        <div className="relative h-20 sm:h-24 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            {subjects.map((subject, index) => {
              const Icon = subject.icon
              const isActive = index === currentSubject
              const angle = (index * 90) - 45
              const radius = isMobile ? 45 : 60
              const x = Math.cos((angle * Math.PI) / 180) * radius
              const y = Math.sin((angle * Math.PI) / 180) * radius
              
              return (
                <div
                  key={index}
                  className={`absolute transition-all duration-500 ${
                    isActive ? 'scale-125 opacity-100' : 'scale-75 opacity-40'
                  }`}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${subject.bgColor} flex items-center justify-center shadow-md border border-gray-700/50`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${subject.color} ${isActive ? 'animate-pulse' : ''}`} />
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Center rotating element */}
          <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-blue-600 border-t-blue-400 rounded-full animate-spin"></div>
        </div>

        {/* Current Subject Display */}
        <div className="space-y-1 sm:space-y-2">
          <p className="text-base sm:text-lg font-semibold text-gray-300 transition-all duration-500">
            Loading {subjects[currentSubject].name}...
          </p>
          
          {/* Animated molecules/atoms for chemistry/physics */}
          {currentSubject === 1 && ( // Physics
            <div className="flex justify-center space-x-1 sm:space-x-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          )}
          
          {currentSubject === 2 && ( // Chemistry
            <div className="flex justify-center items-center space-x-0.5 sm:space-x-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full animate-pulse"></div>
              <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-gray-400 animate-ping"></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '500ms' }}></div>
              <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-gray-400 animate-ping" style={{ animationDelay: '250ms' }}></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '750ms' }}></div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 sm:space-y-3">
          <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-gray-400">
            {progress}% Complete
          </p>
        </div>

        {/* Loading message */}
        <p className="text-xs text-gray-500 animate-pulse">
          Preparing your educational experience...
        </p>
      </div>

      {/* Floating Educational Doodles - Mobile Optimized */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-2 sm:opacity-4">
        {/* Mathematical equations and symbols - Mobile Optimized */}
        {currentSubject === 0 && (
          <>
            <div className="absolute top-[15%] left-[20%] text-blue-400 text-sm sm:text-lg font-mono animate-float">π = 3.14159...</div>
            <div className="hidden sm:block absolute top-[75%] right-[25%] text-purple-400 text-sm sm:text-lg font-mono animate-float-delay">e = 2.71828...</div>
            <div className="absolute bottom-[20%] left-[35%] text-green-400 text-sm sm:text-lg font-mono animate-float-slow">√2 = 1.414...</div>
            <div className="absolute top-[45%] right-[30%] text-indigo-400 text-base sm:text-xl font-bold animate-float">E=mc²</div>
            <div className="hidden sm:block absolute top-[25%] right-[15%] text-orange-400 text-sm sm:text-lg animate-float-delay">∫∞ dx</div>
            <div className="hidden lg:block absolute bottom-[35%] right-[10%] text-pink-400 text-sm sm:text-lg animate-float-slow">Σ = 1+2+3...</div>
            <div className="absolute top-[65%] left-[15%] text-cyan-400 text-xl sm:text-2xl animate-float">📐</div>
            <div className="hidden sm:block absolute top-[10%] left-[45%] text-yellow-400 text-xl sm:text-2xl animate-float-delay">📊</div>
            <div className="hidden lg:block absolute bottom-[45%] left-[75%] text-violet-400 text-sm sm:text-lg animate-drift">x² + y² = r²</div>
            <div className="hidden lg:block absolute top-[85%] right-[45%] text-emerald-400 text-sm sm:text-lg animate-sparkle">sin²θ + cos²θ = 1</div>
            <div className="hidden lg:block absolute top-[35%] left-[5%] text-rose-400 text-sm sm:text-lg animate-float-slow">lim(x→∞)</div>
            <div className="hidden lg:block absolute bottom-[10%] right-[65%] text-teal-400 text-sm sm:text-lg animate-float">dy/dx</div>
            <div className="hidden lg:block absolute top-[55%] left-[40%] text-gray-500 text-sm sm:text-lg animate-drift">∑n²</div>
            <div className="hidden lg:block absolute bottom-[60%] right-[40%] text-gray-400 text-sm sm:text-lg animate-float-slow">√π</div>
          </>
        )}

        {/* Physics formulas and elements - Mobile Optimized */}
        {currentSubject === 1 && (
          <>
            <div className="absolute top-[20%] left-[25%] text-green-400 text-lg font-mono animate-float">F = ma</div>
            <div className="hidden sm:block absolute top-[70%] right-[20%] text-blue-400 text-lg font-mono animate-float-delay">E = hf</div>
            <div className="absolute bottom-[25%] left-[30%] text-purple-400 text-lg font-mono animate-float-slow">V = IR</div>
            <div className="absolute top-[50%] right-[35%] text-orange-400 text-lg font-bold animate-float">PV = nRT</div>
            <div className="absolute top-[15%] right-[10%] text-cyan-400 text-2xl animate-float-delay">⚡</div>
            <div className="hidden sm:block absolute bottom-[30%] right-[15%] text-yellow-400 text-2xl animate-float-slow">🌊</div>
            <div className="hidden lg:block absolute top-[60%] left-[20%] text-red-400 text-lg animate-float">λ = c/f</div>
            <div className="hidden sm:block absolute top-[5%] left-[50%] text-indigo-400 text-2xl animate-float-delay">🔬</div>
            <div className="hidden lg:block absolute bottom-[40%] left-[70%] text-lime-400 text-lg animate-drift">p = mv</div>
            <div className="hidden lg:block absolute top-[80%] right-[50%] text-pink-400 text-lg animate-sparkle">W = Fd</div>
            <div className="hidden lg:block absolute top-[40%] left-[8%] text-amber-400 text-lg animate-float-slow">P = IV</div>
            <div className="hidden lg:block absolute bottom-[15%] right-[70%] text-violet-400 text-lg animate-float">KE = ½mv²</div>
            <div className="hidden lg:block absolute top-[30%] left-[60%] text-gray-500 text-lg animate-drift">ΔE</div>
            <div className="hidden lg:block absolute bottom-[50%] right-[55%] text-gray-400 text-lg animate-float-slow">ω = 2πf</div>
          </>
        )}

        {/* Chemistry formulas and elements - Mobile Optimized */}
        {currentSubject === 2 && (
          <>
            <div className="absolute top-[18%] left-[22%] text-purple-200 dark:text-purple-400 text-lg font-mono animate-float">H₂O</div>
            <div className="hidden sm:block absolute top-[72%] right-[18%] text-blue-200 dark:text-blue-400 text-lg font-mono animate-float-delay">NaCl</div>
            <div className="absolute bottom-[22%] left-[28%] text-green-200 dark:text-green-400 text-lg font-mono animate-float-slow">CO₂</div>
            <div className="absolute top-[48%] right-[32%] text-orange-200 dark:text-orange-400 text-lg font-bold animate-float">CH₄</div>
            <div className="hidden lg:block absolute top-[12%] right-[8%] text-pink-200 dark:text-pink-400 text-lg animate-float-delay">C₆H₁₂O₆</div>
            <div className="absolute bottom-[28%] right-[12%] text-cyan-200 dark:text-cyan-400 text-2xl animate-float-slow">⚗️</div>
            <div className="hidden sm:block absolute top-[58%] left-[18%] text-yellow-200 dark:text-yellow-400 text-lg animate-float">pH = 7</div>
            <div className="hidden sm:block absolute top-[8%] left-[48%] text-red-200 dark:text-red-400 text-2xl animate-float-delay">🧪</div>
            <div className="hidden lg:block absolute bottom-[38%] left-[68%] text-emerald-200 dark:text-emerald-400 text-lg animate-drift">2H₂ + O₂ → 2H₂O</div>
            <div className="hidden lg:block absolute top-[78%] right-[48%] text-violet-200 dark:text-violet-400 text-lg animate-sparkle">CaCO₃</div>
            <div className="hidden lg:block absolute top-[38%] left-[6%] text-lime-200 dark:text-lime-400 text-lg animate-float-slow">HCl</div>
            <div className="hidden lg:block absolute bottom-[12%] right-[68%] text-rose-200 dark:text-rose-400 text-lg animate-float">NH₃</div>
            <div className="hidden lg:block absolute top-[28%] left-[75%] text-gray-300 dark:text-gray-500 text-lg animate-drift">OH⁻</div>
            <div className="hidden lg:block absolute bottom-[55%] right-[25%] text-white dark:text-gray-400 text-lg animate-float-slow">H⁺</div>
          </>
        )}

        {/* Biology elements - Mobile Optimized */}
        {currentSubject === 3 && (
          <>
            <div className="absolute top-[16%] left-[24%] text-green-200 dark:text-green-400 text-lg font-mono animate-float">DNA</div>
            <div className="hidden sm:block absolute top-[74%] right-[16%] text-blue-200 dark:text-blue-400 text-lg font-mono animate-float-delay">RNA</div>
            <div className="absolute bottom-[24%] left-[32%] text-purple-200 dark:text-purple-400 text-lg font-mono animate-float-slow">ATP</div>
            <div className="hidden lg:block absolute top-[46%] right-[34%] text-orange-200 dark:text-orange-400 text-lg font-bold animate-float">C₆H₁₂O₆ + O₂</div>
            <div className="absolute top-[14%] right-[12%] text-pink-200 dark:text-pink-400 text-2xl animate-float-delay">🦠</div>
            <div className="absolute bottom-[26%] right-[14%] text-cyan-200 dark:text-cyan-400 text-2xl animate-float-slow">🧬</div>
            <div className="hidden sm:block absolute top-[56%] left-[16%] text-yellow-200 dark:text-yellow-400 text-2xl animate-float">🌱</div>
            <div className="hidden lg:block absolute top-[6%] left-[46%] text-emerald-200 dark:text-emerald-400 text-lg animate-float-delay">Photosynthesis</div>
            <div className="hidden lg:block absolute bottom-[36%] left-[66%] text-lime-200 dark:text-lime-400 text-lg animate-drift">Mitosis</div>
            <div className="hidden lg:block absolute top-[76%] right-[46%] text-violet-200 dark:text-violet-400 text-lg animate-sparkle">Meiosis</div>
            <div className="hidden lg:block absolute top-[36%] left-[4%] text-teal-200 dark:text-teal-400 text-lg animate-float-slow">Enzymes</div>
            <div className="hidden lg:block absolute bottom-[14%] right-[66%] text-rose-200 dark:text-rose-400 text-lg animate-float">Proteins</div>
            <div className="hidden lg:block absolute top-[26%] left-[70%] text-gray-300 dark:text-gray-500 text-lg animate-drift">mRNA</div>
            <div className="hidden lg:block absolute bottom-[45%] right-[30%] text-white dark:text-gray-400 text-lg animate-float-slow">tRNA</div>
          </>
        )}

        {/* Common educational doodles - Mobile Optimized */}
        <div className="absolute top-[8%] left-[12%] text-amber-200 dark:text-amber-400 text-xl sm:text-3xl animate-drift">📚</div>
        <div className="absolute bottom-[8%] right-[12%] text-blue-200 dark:text-blue-400 text-xl sm:text-3xl animate-float">🎓</div>
        <div className="hidden sm:block absolute top-[28%] left-[6%] text-orange-200 dark:text-orange-400 text-lg sm:text-2xl animate-float-delay">✏️</div>
        <div className="hidden sm:block absolute bottom-[18%] left-[10%] text-green-200 dark:text-green-400 text-lg sm:text-2xl animate-float-slow">📝</div>
        <div className="hidden sm:block absolute top-[18%] right-[6%] text-purple-200 dark:text-purple-400 text-lg sm:text-2xl animate-drift">🔍</div>
        <div className="absolute bottom-[58%] right-[8%] text-yellow-200 dark:text-yellow-400 text-lg sm:text-2xl animate-sparkle">💡</div>
        <div className="hidden lg:block absolute top-[48%] right-[8%] text-pink-200 dark:text-pink-400 text-lg sm:text-2xl animate-float">🖊️</div>
        <div className="hidden lg:block absolute bottom-[28%] left-[8%] text-cyan-200 dark:text-cyan-400 text-lg sm:text-2xl animate-float-delay">📖</div>
        <div className="hidden lg:block absolute top-[68%] left-[14%] text-red-200 dark:text-red-400 text-lg sm:text-2xl animate-drift">🏆</div>
        <div className="hidden lg:block absolute bottom-[48%] right-[18%] text-indigo-200 dark:text-indigo-400 text-lg sm:text-2xl animate-float-slow">🌟</div>
        <div className="hidden lg:block absolute top-[88%] left-[40%] text-violet-200 dark:text-violet-400 text-lg sm:text-2xl animate-sparkle">📐</div>
        <div className="hidden lg:block absolute bottom-[88%] right-[40%] text-emerald-200 dark:text-emerald-400 text-lg sm:text-2xl animate-float">📊</div>
        <div className="hidden lg:block absolute top-[78%] left-[80%] text-rose-200 dark:text-rose-400 text-lg sm:text-2xl animate-float-delay">🧮</div>
        <div className="hidden lg:block absolute bottom-[78%] right-[80%] text-lime-200 dark:text-lime-400 text-lg sm:text-2xl animate-drift">📏</div>
        <div className="hidden lg:block absolute top-[58%] left-[88%] text-teal-200 dark:text-teal-400 text-base sm:text-xl animate-float-slow">🎯</div>
        <div className="hidden lg:block absolute bottom-[58%] right-[88%] text-amber-200 dark:text-amber-400 text-base sm:text-xl animate-sparkle">⭐</div>
        <div className="hidden lg:block absolute top-[38%] left-[92%] text-sky-200 dark:text-sky-400 text-base sm:text-xl animate-float">🔬</div>
        <div className="hidden lg:block absolute bottom-[38%] right-[92%] text-pink-200 dark:text-pink-400 text-base sm:text-xl animate-float-delay">🔭</div>
        
        {/* Additional white/light elements for subtle background - Desktop only */}
        <div className="hidden lg:block absolute top-[43%] left-[50%] text-gray-200 dark:text-gray-600 text-sm sm:text-lg animate-drift">⭐</div>
        <div className="hidden lg:block absolute bottom-[35%] right-[45%] text-white dark:text-gray-500 text-base sm:text-xl animate-float-slow">✨</div>
        <div className="hidden lg:block absolute top-[63%] right-[60%] text-gray-300 dark:text-gray-600 text-sm sm:text-lg animate-sparkle">•</div>
        <div className="hidden lg:block absolute bottom-[25%] left-[55%] text-white dark:text-gray-500 text-sm sm:text-lg animate-float">◦</div>
        
        {/* Famous Scientists Names - Desktop only */}
        <div className="hidden lg:block absolute top-[12%] left-[55%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float opacity-50">Newton</div>
        <div className="hidden lg:block absolute bottom-[12%] left-[25%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float-delay opacity-50">Einstein</div>
        <div className="hidden lg:block absolute top-[52%] left-[10%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float-slow opacity-50">Curie</div>
        <div className="hidden lg:block absolute bottom-[22%] right-[10%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-drift opacity-50">Darwin</div>
        <div className="hidden lg:block absolute top-[72%] right-[55%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float-delay opacity-50">Mendel</div>
        <div className="hidden lg:block absolute top-[22%] left-[85%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-sparkle opacity-50">Tesla</div>
        <div className="hidden lg:block absolute bottom-[72%] right-[85%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float opacity-50">Galileo</div>
        <div className="hidden lg:block absolute top-[42%] left-[75%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float-slow opacity-50">Pasteur</div>
        <div className="hidden lg:block absolute bottom-[42%] right-[75%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-drift opacity-50">Kepler</div>
        <div className="hidden lg:block absolute top-[62%] left-[60%] text-slate-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-float-delay opacity-50">Planck</div>
        <div className="hidden lg:block absolute top-[32%] right-[85%] text-white dark:text-slate-500 text-xs sm:text-sm font-serif animate-float opacity-40">Faraday</div>
        <div className="hidden lg:block absolute bottom-[32%] left-[85%] text-gray-300 dark:text-slate-500 text-xs sm:text-sm font-serif animate-drift opacity-40">Bohr</div>
        
        {/* Laboratory equipment - Minimal on mobile */}
        <div className="hidden lg:block absolute top-[32%] right-[22%] text-emerald-200 dark:text-emerald-400 text-base sm:text-xl animate-float-slow">🔬</div>
        <div className="hidden lg:block absolute bottom-[32%] left-[22%] text-purple-200 dark:text-purple-400 text-base sm:text-xl animate-drift">⚗️</div>
        <div className="hidden lg:block absolute top-[82%] right-[65%] text-blue-200 dark:text-blue-400 text-base sm:text-xl animate-float">🧪</div>
        <div className="hidden lg:block absolute bottom-[82%] left-[65%] text-orange-200 dark:text-orange-400 text-base sm:text-xl animate-float-delay">🌡️</div>
        <div className="hidden lg:block absolute top-[72%] left-[45%] text-red-200 dark:text-red-400 text-base sm:text-xl animate-sparkle">⚖️</div>
        <div className="hidden lg:block absolute bottom-[72%] right-[25%] text-cyan-200 dark:text-cyan-400 text-base sm:text-xl animate-float-slow">🔭</div>
        <div className="hidden lg:block absolute top-[52%] right-[85%] text-gray-200 dark:text-gray-500 text-sm sm:text-lg animate-drift">⚙️</div>
        <div className="hidden lg:block absolute bottom-[52%] left-[85%] text-white dark:text-gray-400 text-sm sm:text-lg animate-float">🧰</div>
        
        {/* Academic symbols - Desktop only */}
        <div className="hidden lg:block absolute top-[25%] left-[78%] text-violet-200 dark:text-violet-400 text-base sm:text-xl animate-float-slow">∞</div>
        <div className="hidden lg:block absolute bottom-[25%] left-[45%] text-teal-200 dark:text-teal-400 text-sm sm:text-lg animate-drift">α β γ</div>
        <div className="hidden lg:block absolute top-[85%] left-[15%] text-rose-200 dark:text-rose-400 text-sm sm:text-lg animate-float-delay">Δ Σ Ω</div>
        <div className="hidden lg:block absolute top-[15%] right-[78%] text-lime-200 dark:text-lime-400 text-sm sm:text-lg animate-sparkle">∈ ∉ ∅</div>
        <div className="hidden lg:block absolute bottom-[15%] left-[78%] text-sky-200 dark:text-sky-400 text-sm sm:text-lg animate-float">∀ ∃ ∴</div>
        <div className="hidden lg:block absolute top-[45%] left-[95%] text-amber-200 dark:text-amber-400 text-sm sm:text-lg animate-float-delay">∇ ∂ ∫</div>
        <div className="hidden lg:block absolute bottom-[45%] right-[95%] text-indigo-200 dark:text-indigo-400 text-sm sm:text-lg animate-drift">∑ ∏ ∪</div>
        <div className="hidden lg:block absolute top-[65%] right-[78%] text-pink-200 dark:text-pink-400 text-sm sm:text-lg animate-float-slow">∩ ⊂ ⊃</div>
        <div className="hidden lg:block absolute bottom-[65%] left-[55%] text-emerald-200 dark:text-emerald-400 text-sm sm:text-lg animate-sparkle">≤ ≥ ≠</div>
        <div className="hidden lg:block absolute top-[55%] right-[95%] text-violet-200 dark:text-violet-400 text-sm sm:text-lg animate-float">± × ÷</div>
        <div className="hidden lg:block absolute top-[75%] left-[25%] text-gray-200 dark:text-gray-500 text-sm sm:text-lg animate-drift">θ φ ψ</div>
        <div className="hidden lg:block absolute bottom-[75%] right-[35%] text-white dark:text-gray-400 text-sm sm:text-lg animate-float-slow">μ σ λ</div>
        
        {/* Corner elements - Desktop only */}
        <div className="hidden lg:block absolute top-[3%] left-[3%] text-lime-200 dark:text-lime-400 text-sm sm:text-lg animate-float-slow">📋</div>
        <div className="hidden lg:block absolute bottom-[3%] right-[3%] text-pink-200 dark:text-pink-400 text-sm sm:text-lg animate-drift">🎨</div>
        <div className="hidden lg:block absolute top-[97%] left-[70%] text-teal-200 dark:text-teal-400 text-sm sm:text-lg animate-sparkle">✨</div>
        <div className="hidden lg:block absolute bottom-[97%] right-[70%] text-violet-200 dark:text-violet-400 text-sm sm:text-lg animate-float">🔥</div>
        <div className="hidden lg:block absolute top-[7%] right-[50%] text-emerald-200 dark:text-emerald-400 text-sm sm:text-lg animate-float-delay">📍</div>
        <div className="hidden lg:block absolute bottom-[7%] left-[50%] text-orange-200 dark:text-orange-400 text-sm sm:text-lg animate-drift">🚀</div>
        <div className="hidden lg:block absolute top-[50%] left-[3%] text-blue-200 dark:text-blue-400 text-sm sm:text-lg animate-sparkle">⚡</div>
        <div className="hidden lg:block absolute bottom-[50%] right-[3%] text-red-200 dark:text-red-400 text-sm sm:text-lg animate-float-slow">💫</div>
        <div className="hidden lg:block absolute top-[93%] right-[30%] text-purple-200 dark:text-purple-400 text-sm sm:text-lg animate-float">🎪</div>
        <div className="hidden lg:block absolute bottom-[93%] left-[30%] text-cyan-200 dark:text-cyan-400 text-sm sm:text-lg animate-drift">🎭</div>
        
        {/* Accent points - Desktop only */}
        <div className="hidden lg:block absolute top-[20%] left-[90%] text-white dark:text-gray-500 text-xs sm:text-sm animate-float opacity-30">•</div>
        <div className="hidden lg:block absolute bottom-[20%] right-[90%] text-gray-200 dark:text-gray-600 text-xs sm:text-sm animate-drift opacity-30">◦</div>
        <div className="hidden lg:block absolute top-[80%] left-[5%] text-white dark:text-gray-500 text-xs sm:text-sm animate-sparkle opacity-30">✦</div>
        <div className="hidden lg:block absolute bottom-[80%] right-[5%] text-gray-200 dark:text-gray-600 text-xs sm:text-sm animate-float opacity-30">✧</div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-15px) rotate(3deg); opacity: 1; }
        }
        @keyframes float-delay {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-20px) rotate(-3deg); opacity: 1; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-12px) rotate(2deg); opacity: 0.9; }
        }
        @keyframes drift {
          0% { transform: translateX(0px) translateY(0px) rotate(0deg); }
          25% { transform: translateX(10px) translateY(-5px) rotate(2deg); }
          50% { transform: translateX(-5px) translateY(-10px) rotate(-1deg); }
          75% { transform: translateX(-10px) translateY(-5px) rotate(1deg); }
          100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-delay {
          animation: float-delay 5s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-drift {
          animation: drift 8s ease-in-out infinite;
        }
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}