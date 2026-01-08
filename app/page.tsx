import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-6 text-center">
        {/* Hero */}
        <div className="mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/241_12-10-2022-02-10-45-mallweb.png"
              alt="Mall Web Logo"
              width={200}
              height={80}
              className="h-20 w-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-5xl font-bold mb-4">
            <span className="text-red-600">
              PC Builder
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Armá tu PC componente por componente con verificación de compatibilidad automática
          </p>
          
          <Link
            href="/pc-builder"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl
              bg-red-600 
              hover:bg-red-700
              text-white font-semibold text-lg
              shadow-lg shadow-red-500/25 hover:shadow-red-500/40
              transition-all duration-200 hover:scale-105"
          >
            <span>Empezar a armar</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-2">Catálogo completo</h3>
            <p className="text-sm text-gray-600">
              Accedé a miles de componentes actualizados en tiempo real
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="text-3xl mb-3">✓</div>
            <h3 className="font-semibold text-gray-900 mb-2">Compatibilidad</h3>
            <p className="text-sm text-gray-600">
              Verificación automática de compatibilidad entre componentes
            </p>
          </div>
          
          <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-semibold text-gray-900 mb-2">Precios actuales</h3>
            <p className="text-sm text-gray-600">
              Precios y stock actualizados directamente del proveedor
            </p>
          </div>
        </div>

        {/* Powered by */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Powered by Mall Web (Gestión Resellers)
          </p>
        </div>
      </div>
    </div>
  );
}
