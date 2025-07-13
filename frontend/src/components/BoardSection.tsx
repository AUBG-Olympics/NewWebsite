import React from "react";

const boardMembers = [
	{
		name: "Mario Boyanov",
		img: "/assets/board1.jpg",
	},
	{
		name: "Spasiela Gizdova",
		img: "/assets/board2.jpg",
	},
	{
		name: "Mila Balkandzhieva",
		img: "/assets/board3.jpg",
	},
	{
		name: "Konstantin Strashnikov",
		img: "/assets/board4.jpg",
	},
];

const BoardSection: React.FC = () => (
	<section
		className="w-full flex justify-center items-center py-8 relative"
		style={{ minHeight: "40vh" }}
	>
		<div
			className="relative z-10 rounded-3xl border-2 border-black shadow-lg flex flex-col items-center py-8 px-8"
			style={{
				width: "87.5vw",
				maxWidth: "87.5vw",
			}}
		>
			{/* Fire pattern background with reduced opacity */}
			<div
				className="absolute top-0 left-0 rounded-3xl w-full h-full z-0 pointer-events-none"
				style={{
					backgroundImage: "url('/assets/fire_pattern.jpg')",
					backgroundRepeat: "repeat",
					backgroundSize: "auto",
					opacity: 0.8,
				}}
			></div>
			{/* Speech Bubble in the upper third */}
			<div
				className="absolute left-10 flex items-center z-20"
				style={{
					top: "8%",
					width: 400,
					height: 180,
					zIndex: 20,
				}}
			>
				<img
					src="/assets/speech_bubble.png"
					alt="Speech Bubble"
					className="absolute left-8 top-0 w-full h-full"
					style={{
						transform: "scaleX(-1) rotate(-15deg)",
					}}
				/>
				<span
					className="absolute left-8 top-0 w-full h-full flex items-center justify-center text-center text-2xl px-12 py-8 font-semibold text-white"
					style={{ fontFamily: "'Lato', sans-serif" }}
				>
					These guys seem pretty cool if you ask me
				</span>
			</div>
			<h2
				className="text-4xl font-bold mb-8 text-white text-center w-full z-20"
				style={{ fontFamily: "'Permanent Marker', cursive" }}
			>
				Meet the Board
			</h2>
			<div className="flex flex-row w-full items-center">
				{/* Left: Presenting Fireguy */}
				<div className="w-2/5 flex flex-row items-center justify-center relative">
					<img
						src="/assets/presenting_fireguy.png"
						alt="Presenting Fireguy"
						className="w-full max-w-md z-10"
					/>
				</div>
				{/* Right: Board Grid */}
				<div className="w-3/5 flex flex-col items-start pl-8 z-20">
					<div className="grid grid-cols-2 gap-8 w-full">
						{boardMembers.map((member, idx) => (
							<div key={idx} className="flex flex-col items">
								<img
									src={member.img}
									alt={member.name}
									className="w-full aspect-[4/3] object-cover rounded-xl border-2 border-black shadow-md"
								/>
								<span
									className="mt-2 text-lg font-semibold text-white"
									style={{ fontFamily: "'Lato', sans-serif" }}
								>
									{member.name}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	</section>
);

export default BoardSection;