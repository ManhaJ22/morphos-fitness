import SignInForm from '@/components/auth/SignInForm';

export default function SignInPage() {
  return (
    <div className="flex h-screen w-full">
      {/* Left side: Form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-8 md:px-16 lg:px-24 bg-white dark:bg-[#111827]">
        <SignInForm />
      </div>
      
      {/* Right side: Decorative area */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-400 to-purple-600 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='smallGrid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='rgba(255, 255, 255, 0.05)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23smallGrid)'/%3E%3C/svg%3E\")" }}></div>
        </div>
        
        {/* Floating geometric shapes */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i}
              className="absolute transform rotate-45 bg-white opacity-10"
              style={{
                width: `${20 + Math.random() * 50}px`,
                height: `${20 + Math.random() * 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDuration: `${10 + Math.random() * 20}s`,
                animationDelay: `${Math.random() * 5}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                animationName: i % 2 === 0 ? 'float-up' : 'float-across',
              }}
            />
          ))}
        </div>
        
        {/* Logo or branding could go here */}
        <div className="absolute bottom-8 left-8 text-white">
          <h2 className="text-2xl font-bold">Morphos</h2>
        </div>
      </div>
    </div>
  );
}