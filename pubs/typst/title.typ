#set page(
	paper: "us-letter",
	margin: 0in,
)

#set text(
	font: "Alegreya SC",
	size: 48pt,
	weight: "medium"
)

#set par(
	leading: 9pt,
	spacing: 1em * 2,
)

#align(horizon + center)[
	#rect(
		width: 75%,
		stroke: none,
	)[
		#place(horizon + left, line(
			start: (10%, 0%),
			end: (10%, 70%),
			stroke: 2pt,
		))
		#pad(left: 15%, top: 20%)[
			#align(left)[
				Nulla Laborum \
				Exercitation \
				Nostrud \
				\

				#text(size: 25pt, weight: "regular")[Lorem Ipsum, PhD]
			]
		]
	]
]
