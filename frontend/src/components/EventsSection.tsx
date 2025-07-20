import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";

const events = [
	{
		title: "Dodgeball Tournament",
		img: "https://res.cloudinary.com/dq9gemegi/image/upload/v1743406551/Posters/CW_Poster_Sponsors_-_9_yrvp46.png",
		description: "Join our annual basketball tournament and compete for the gold!",
	},
	{
		title: "Basketball Tournament",
		img: "https://res.cloudinary.com/dq9gemegi/image/upload/v1743406525/Posters/CW_Poster_Sponsors_-_7_hy0qpc.png",
		description: "Show your skills in our exciting football cup.",
	},
	{
		title: "D-DAY 25",
		img: "https://res.cloudinary.com/dq9gemegi/image/upload/v1743406686/Posters/DDAY_th6pcx.png",
		description: "Spike, serve, and block your way to victory.",
	},
	{
		title: "Table Tennis Open",
		img: "/assets/event_tabletennis.jpg",
		description: "Fast-paced action at the table tennis open.",
	},
	{
		title: "Chess Masters",
		img: "/assets/event_chess.jpg",
		description: "Think fast and play smart at our chess masters event.",
	},
	{
		title: "Swimming Gala",
		img: "/assets/event_swimming.jpg",
		description: "Make a splash at the annual swimming gala.",
	},
	{
		title: "Athletics Day",
		img: "/assets/event_athletics.jpg",
		description: "Run, jump, and throw at our athletics day.",
	},
];

const ITEM_WIDTH = 340; // px

const EventsSection: React.FC = () => {
	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
	const [canScrollPrev, setCanScrollPrev] = useState(false);
	const [canScrollNext, setCanScrollNext] = useState(false);
	const autoScrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

	// Responsive: recalculate container width and gap on each render
	const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1440;
	const { gap } = useMemo(
		() => {
			const vw = windowWidth;
			const containerWidth = 0.875 * vw; // 87.5vw, like AboutUsSection
			const visibleItems = Math.floor(containerWidth / ITEM_WIDTH) || 1;
			const totalGap = containerWidth - visibleItems * ITEM_WIDTH;
			const gap = visibleItems > 1 ? totalGap / (visibleItems - 1 ) : 0;
			return { containerWidth, gap };
		},
		[windowWidth]
	);

	const sidePadding = 0; // Align items to the start (no side padding)

	const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
	const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

	// Update arrow enabled/disabled state
	useEffect(() => {
		if (!emblaApi) return;
		const onSelect = () => {
			setCanScrollPrev(emblaApi.canScrollPrev());
			setCanScrollNext(emblaApi.canScrollNext());
		};
		emblaApi.on("select", onSelect);
		onSelect();
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi]);

	// Autoscroll effect
	useEffect(() => {
		if (!emblaApi) return;
		if (autoScrollInterval.current) {
			clearInterval(autoScrollInterval.current);
		}

		autoScrollInterval.current = setInterval(() => {
			if (emblaApi.canScrollNext()) {
				emblaApi.scrollNext();
			} else {
				emblaApi.scrollTo(0); // Go back to start if at end
			}
		}, 10000);

		return () => {
			if (autoScrollInterval.current) clearInterval(autoScrollInterval.current);
		};
	}, [emblaApi]);

	return (
		<section
			className="w-full flex flex-col items-center py-12 z-10 mt-20"
			style={{
				backgroundImage: "url('/assets/events_background.jpg')",
					backgroundRepeat: "repeat",
					backgroundSize: "auto",
			}}
		>

      
			<h2
				className="text-4xl font-bold mb-8 text-gray-800 text-center"
				style={{ fontFamily: "'Permanent Marker', cursive" }}
			>
				Events
			</h2>
			<div className="flex justify-center items-center w-full">
				<div
					className="relative flex items-center"
					style={{
						width: "87.5vw",
						maxWidth: "87.5vw",
					}}
				>
					{/* Left Arrow */}
					<button
						onClick={scrollPrev}
						disabled={!canScrollPrev}
						aria-label="Previous"
						className="hidden md:block absolute left-0 z-30 bg-white border-2 border-black rounded-full shadow-md w-12 h-12 flex justify-center transition hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
						style={{ transform: "translateX(-60%)" }}
					>
						<span style={{ fontSize: 28, fontWeight: "bold" , color:"black"}}>{"‹"}</span>
					</button>
					<div
						className="overflow-hidden mx-auto"
						ref={emblaRef}
						style={{
							width: "100%",
							willChange: "transform",
						}}
					>
						<div
							className="flex"
							style={{
								gap: `${gap}px`,
								paddingLeft: `${sidePadding}px`,
								paddingRight: `${sidePadding}px`,
								justifyContent: "flex-start",
							}}
						>
							{events.map((event, idx) => (
								<div
									key={idx}
									className="flex-shrink-0 bg-white rounded-2xl shadow-lg border-2 border-black flex flex-col items-center justify-between"
									style={{
										width: `${ITEM_WIDTH}px`,
										aspectRatio: "1 / 1.414",
										minWidth: `${ITEM_WIDTH}px`,
										maxWidth: "90vw",
										willChange: "transform",
									}}
								>
									<div
										className="w-full"
										style={{
											aspectRatio: "1 / 1.414",
											overflow: "hidden",
											borderTopLeftRadius: "1rem",
											borderTopRightRadius: "1rem",
										}}
									>
										<img
											src={event.img}
											alt={event.title}
											className="w-full h-full object-cover"
											style={{ aspectRatio: "1 / 1.414", display: "block" }}
											draggable={false}
										/>
									</div>
									<div className="p-4 flex flex-col items-center">
										<h3
											className="text-2xl font-bold mb-2 text-orange-600 text-center"
											style={{ fontFamily: "'Lato', sans-serif" }}
										>
											{event.title}
										</h3>
										<p className="text-gray-700 text-center">
											{event.description}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
					{/* Right Arrow */}
					<button
						onClick={scrollNext}
						disabled={!canScrollNext}
						aria-label="Next"
						className="hidden md:block absolute right-0 z-30 bg-white border-2 border-black rounded-full shadow-md w-12 h-12 flex  justify-center transition hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
						style={{ transform: "translateX(60%)" }}
					>
						<span style={{ fontSize: 28, fontWeight: "bold", color:"black", padding:"auto" }}>{"›"}</span>
					</button>
				</div>
			</div>
		</section>
	);
};

export default EventsSection;