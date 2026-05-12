import { login, loginWithGoogle } from './actions'
import { Microscope, Boxes, LayoutDashboard, ShieldCheck, Activity, ChevronRight } from 'lucide-react'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const { message } = await searchParams

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-teal-500 selection:text-white flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full flex-grow flex items-center justify-center overflow-hidden bg-slate-950 text-white py-20 lg:py-0">
        {/* Abstract Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Deep base gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"></div>
          
          {/* Teal accent glow top-right */}
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px]"></div>
          
          {/* Emerald accent glow bottom-left */}
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px]"></div>
          
          {/* Subtle grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>

        <div className="container relative z-10 px-4 mx-auto grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          {/* Hero Content */}
          <div className="space-y-8 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/50 border border-teal-900/50 text-teal-400 text-xs font-semibold tracking-wider uppercase backdrop-blur-md shadow-lg shadow-teal-900/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              Smart Manufacturing System
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-none text-white">
                EVAS <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">MES</span>
              </h1>
              <p className="text-xl text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
                화장품 제조의 미래를 설계합니다.<br />
                생산 계획부터 출하까지, 완벽한 품질 관리 시스템.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 justify-center lg:justify-start pt-2">
               <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 backdrop-blur-sm">
                 <div className="p-2 bg-teal-500/10 rounded-md">
                   <ShieldCheck className="w-5 h-5 text-teal-400" />
                 </div>
                 <div className="text-left">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Certified</p>
                    <p className="text-sm font-medium text-slate-300">ISO 22716</p>
                 </div>
               </div>
               <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 backdrop-blur-sm">
                 <div className="p-2 bg-emerald-500/10 rounded-md">
                   <Activity className="w-5 h-5 text-emerald-400" />
                 </div>
                 <div className="text-left">
                    <p className="text-xs text-slate-500 font-semibold uppercase">System</p>
                    <p className="text-sm font-medium text-slate-300">Real-time Sync</p>
                 </div>
               </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="w-full max-w-md mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 shadow-2xl p-8 space-y-8 ring-1 ring-white/10">
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
                <p className="text-slate-400 text-sm">시스템 접속을 위해 로그인해주세요</p>
              </div>

              <form className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-xs font-semibold text-slate-300 uppercase tracking-wide ml-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@evas.co.kr"
                    required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label htmlFor="password" className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                      Password
                    </label>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all placeholder:text-slate-600"
                  />
                </div>

                {message && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                    {message}
                  </div>
                )}

                <button
                  formAction={login}
                  className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-teal-900/20 transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  로그인
                </button>

                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900/80 px-2 text-slate-500 backdrop-blur-xl">Or continue with</span>
                  </div>
                </div>

                <button
                  formAction={loginWithGoogle}
                  formNoValidate
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </button>
              </form>
            </div>
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                Authorized Personnel Only &bull; Secure Connection
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Integrated Manufacturing Intelligence
            </h2>
            <p className="text-slate-600">
              생산 현장의 모든 데이터를 실시간으로 연결하여 최적의 의사결정을 지원합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
                <LayoutDashboard className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">생산 계획 관리</h3>
              <p className="text-slate-500 leading-relaxed mb-4">
                직관적인 칸반 보드를 통해 생산 일정을 한눈에 파악하고 효율적으로 관리하세요.
              </p>
              <div className="flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-teal-100 transition-colors">
                <Boxes className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-teal-600 transition-colors">실시간 재고 추적</h3>
              <p className="text-slate-500 leading-relaxed mb-4">
                ERP 연동을 통해 원자재부터 완제품까지 정확한 재고 흐름을 실시간으로 추적합니다.
              </p>
              <div className="flex items-center text-teal-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-100 transition-colors">
                <Microscope className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">품질 관리 (QC)</h3>
              <p className="text-slate-500 leading-relaxed mb-4">
                원료 입고부터 완제품 출하까지 엄격한 품질 기준을 적용하고 이력을 관리합니다.
              </p>
              <div className="flex items-center text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0 duration-300">
                Learn more <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-white border-t border-slate-100 text-center">
        <div className="container mx-auto px-4">
          <p className="text-slate-400 text-sm font-medium">
            © 2025 EVAS Cosmetic. All rights reserved.
          </p>
          <p className="text-slate-300 text-xs mt-2">
            System Version 2.0.0 &bull; Powered by RISE MES
          </p>
        </div>
      </footer>
    </div>
  )
}
