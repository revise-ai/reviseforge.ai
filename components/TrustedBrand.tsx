const TrustedBrand = () => {
  const companyLogos = [
    "slack",
    "framer",
    "netflix",
    "google",
    "linkedin",
    "instagram",
    "facebook",
  ];

  return (
    <>
      <style>{`
                .marquee-inner {
                    animation: marqueeScroll linear infinite;
                }

                @keyframes marqueeScroll {
                    0% {
                        transform: translateX(0%);
                    }

                    100% {
                        transform: translateX(-50%);
                    }
                }
            `}</style>

      <div className="overflow-hidden w-full relative max-w-5xl mx-auto select-none">
        <div className="text-center mt-10 mb-8">
          <p className="text-sm text-gray-400 font-medium tracking-wide">
            Trusted by students at top universities worldwide
          </p>
        </div>
        <div className="absolute left-0 top-0 h-full w-20 z-10 pointer-events-none bg-linear-to-r from-white to-transparent" />
        <div
          className="marquee-inner flex will-change-transform min-w-[200%]"
          style={{ animationDuration: "15s" }}
        >
          <div className="flex">
            {[...companyLogos, ...companyLogos].map((company, index) => (
              <img
                key={index}
                src={`https://raw.githubusercontent.com/prebuiltui/prebuiltui/main/assets/companyLogo/${company}.svg`}
                alt={company}
                className="w-full h-full object-cover mx-6"
                draggable={false}
              />
            ))}
          </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-20 md:w-40 z-10 pointer-events-none bg-linear-to-l from-white to-transparent" />
      </div>
    </>
  );
};

export default TrustedBrand;
