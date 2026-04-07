const CallToAction = () => {
    return (
        <>
            <style>
                {`
                    @import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap");
                    *{
                        font-family: "Poppins", sans-serif;
                    }
                `}
            </style>

            <section className="bg-white py-16 px-4">
                <div className="max-w-5xl mx-auto bg-gradient-to-b from-[#F8FAFF] to-[#EEF2FF] border border-[#E0E7FF] rounded-[20px] relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, rgba(59, 130, 246, 0.15) 1px, transparent 1px)", backgroundSize: "80px 100%" }}></div>
                    <div className="relative px-8 py-12 md:py-20 text-center">
                        <h1 className="text-3xl md:text-5xl/14 leading-tight font-semibold tracking-tighter max-w-xl mx-auto mb-4">
                            Master your exams <span className="bg-gradient-to-r from-blue-500 to-blue-800 bg-clip-text text-transparent">in half the time</span>
                        </h1>
                        <p className="text-sm text-neutral-600 max-w-md mx-auto mb-8">
                            Upload your lectures, PDFs, YouTube videos, or website articles to instantly generate elite flashcards, interactive quizzes, and structured summaries.
                        </p>
                        <button className="bg-gradient-to-b from-blue-600 to-blue-800 text-white text-sm px-8 py-3.5 rounded-lg border border-blue-500 inline-flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer group shadow-lg shadow-blue-500/20">
                            <div className="relative overflow-hidden">
                                <span className="block transition-transform duration-200 group-hover:-translate-y-full font-medium">
                                    Start learning for free
                                </span>
                                <span className="absolute top-0 left-0 block transition-transform duration-200 group-hover:translate-y-0 translate-y-full font-medium">
                                    Start learning for free
                                </span>
                            </div>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m5.833 14.168 8.334-8.333m0 8.333V5.835H5.833" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </button>
                    </div>
                </div>
            </section>
        </>
    )
}

export default CallToAction
