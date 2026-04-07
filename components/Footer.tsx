const Footer = () => {
  return (
    <>
      <style>
        {`
                    @import url('https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap');
                    *{
                        font-family: "Geist", sans-serif;
                    }
                `}
      </style>
      <div className="bg-gray-100 pt-20 px-4">
        <footer className="bg-[#131314] w-full max-w-337.5 mx-auto text-white pt-8 lg:pt-12 px-4 sm:px-8 md:px-16 lg:px-28 rounded-tl-3xl rounded-tr-3xl overflow-hidden">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-6 gap-8 md:gap-12">
            <div className="lg:col-span-3 space-y-6">
              <a href="/" className="block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-900/20 flex items-center justify-center bg-[#131314] border border-neutral-800">
                    <img 
                      src="/assets/reviseforge-icon-only.png" 
                      alt="ReviseForge Logo" 
                      className="w-full h-full object-contain p-1"
                    />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-white">ReviseForge</span>
                </div>
              </a>
              <p className="text-sm/6 text-neutral-400 max-w-96">
                ReviseForge is the all-in-one learning operating system. We transform messy lectures and long videos into structured academic assets to help you master any subject.
              </p>
              <div className="flex gap-5 md:gap-6 order-1 md:order-2">
                <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>
                </a>
                <a href="#" className="text-neutral-400 hover:text-white transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                </a>
              </div>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 lg:gap-28 items-start">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-500 mb-6">Products</h3>
                <ul className="space-y-4 text-sm text-neutral-300">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">YouTube Analysis</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Voice Recording</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Exam Simulation</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">AI Note-Taking</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-500 mb-6">Resources</h3>
                <ul className="space-y-4 text-sm text-neutral-300">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Study Guides</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">API Access</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Support</a></li>
                </ul>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-500 mb-6">Company</h3>
                <ul className="space-y-4 text-sm text-neutral-300">
                  <li><a href="#" className="hover:text-blue-400 transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Vision</a></li>
                  <li className="flex items-center gap-2">
                    <a href="#" className="hover:text-blue-400 transition-colors">Careers</a>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">HIRING</span>
                  </li>
                  <li><a href="#" className="hover:text-blue-400 transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-neutral-800/50 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-neutral-500 text-xs">© 2026 ReviseForge Inc. Built for top performers.</p>
            <p className="text-xs text-neutral-500">All rights reserved.</p>
          </div>
          <h3 className="text-center font-extrabold leading-[0.9] text-transparent text-[clamp(2rem,12vw,16rem)] [-webkit-text-stroke:1px_#0D3B54] mt-6 select-none">
            ReviseForge
          </h3>
        </footer>
      </div>
    </>
  );
};

export default Footer;
