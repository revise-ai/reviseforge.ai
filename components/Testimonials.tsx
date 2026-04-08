import React from 'react';
import Image from 'next/image';

interface TestimonialCard {
    image: string;
    name: string;
    affiliation: string;
    quote: string;
}

const Testimonials = () => {
    const cardsData: TestimonialCard[] = [
        {
            image: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200',
            name: 'Sarah K.',
            affiliation: 'Medical Student',
            quote: 'ReviseForge makes studying medicine manageable. I can turn long lectures into notes in seconds.',
        },
        {
            image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
            name: 'James O.',
            affiliation: 'MIT Engineering',
            quote: 'As an engineering student, the AI handles complex technical language and formulas perfectly.',
        },
        {
            image: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=60',
            name: 'Priya S.',
            affiliation: 'Oxford Law',
            quote: 'summarizing mountains of legal text accurately without losing any nuance. Absolute game changer.',
        },
        {
            image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=60',
            name: 'Kofi M.',
            affiliation: 'Computer Science',
            quote: "The group study features are insane. It's like having a private tutor in every single chat.",
        },
        {
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200',
            name: 'Ama O.',
            affiliation: 'University of Ghana',
            quote: 'I went from struggling to top of my class. The summaries and flashcards are exactly what I needed.',
        },
        {
            image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200',
            name: 'Emmanuel B.',
            affiliation: 'Lagos University',
            quote: 'Genuinely the best study tool I have used. I can flip through flashcards on my phone anywhere.',
        },
    ];

    const CreateCard = ({ card }: { card: TestimonialCard }) => (
        <div className="bg-white p-6 rounded-2xl mx-4 border border-gray-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 w-80 shrink-0 cursor-pointer">
            <div className="flex gap-3 mb-4">
                <Image className="w-11 h-11 rounded-full object-cover border border-gray-50" src={card.image} alt={card.name} width={44} height={44} />
                <div className="flex flex-col">
                    <p className="text-sm font-bold text-gray-900">{card.name}</p>
                    <span className="text-[11px] font-medium text-blue-600 uppercase tracking-tight">{card.affiliation}</span>
                </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-600 italic">
                &ldquo;{card.quote}&rdquo;
            </p>
        </div>
    );

    return (
        <section className="bg-[#f8f9fb] py-24 overflow-hidden">
            <style>{`
                @keyframes marqueeScroll {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }

                .marquee-inner {
                    animation: marqueeScroll 40s linear infinite;
                }

                .marquee-reverse {
                    animation-direction: reverse;
                }
                
                .marquee-inner:hover {
                    animation-play-state: paused;
                }
            `}</style>

            <div className="max-w-5xl mx-auto px-4 mb-16 text-center">
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    What people are saying
                </h2>
                <p className="text-gray-500 text-lg max-w-2xl mx-auto leading-relaxed">
                    Real feedback from students, researchers, and learners building the future of education with ReviseForge.
                </p>
            </div>

            <div className="marquee-row w-full mx-auto max-w-7xl overflow-hidden relative">
                <div className="absolute left-0 top-0 h-full w-32 z-10 pointer-events-none bg-gradient-to-r from-[#f8f9fb] to-transparent"></div>
                <div className="marquee-inner flex transform-gpu min-w-[200%] py-5">
                    {[...cardsData, ...cardsData].map((card, index) => (
                        <CreateCard key={index} card={card} />
                    ))}
                </div>
                <div className="absolute right-0 top-0 h-full w-32 z-10 pointer-events-none bg-gradient-to-l from-[#f8f9fb] to-transparent"></div>
            </div>

            <div className="marquee-row w-full mx-auto max-w-7xl overflow-hidden relative mt-4">
                <div className="absolute left-0 top-0 h-full w-32 z-10 pointer-events-none bg-gradient-to-r from-[#f8f9fb] to-transparent"></div>
                <div className="marquee-inner marquee-reverse flex transform-gpu min-w-[200%] py-5">
                    {[...[...cardsData].reverse(), ...[...cardsData].reverse()].map((card, index) => (
                        <CreateCard key={index} card={card} />
                    ))}
                </div>
                <div className="absolute right-0 top-0 h-full w-32 z-10 pointer-events-none bg-gradient-to-l from-[#f8f9fb] to-transparent"></div>
            </div>
        </section>
    )
}

export default Testimonials;