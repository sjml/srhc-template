#import "/pubs/typst/config/styling.typ"
#show: styling.standard_styles

#set page(
	header: none,
	footer: none,
)


#let typst-repeat(gap: none, justify: false, body) = layout(size => context {
	let pt(length) = measure(h(length)).width
	let width = measure(body).width
	let amount = calc.floor(pt(size.width + gap) / pt(width + gap))

	let gap = if not justify { gap } else {
		(size.width - amount * width) / (amount - 1)
	}

	let items = ((box(body),) * amount)
	if type(gap) == length and gap != 0pt {
		items = items.intersperse(h(gap))
	}

	items.join()
})

#show outline.entry.where(level: 1): it => {
	block(above: 2.8em,
		text(weight: "bold", size: 17pt,
			link(it.element.location(), text(fill: black, it.body()))
		)
	)
}
#show outline.entry.where(level: 2): it => {
	// would be better to calculate this,
	//   (maybe per-section?)
	//   but roman numerals make it hard
	let max-page-width = 2.4em

	block(above: 1.4em)[
		#link(
			it.element.location(),
			text(fill: black)[#it.body()]
		)
		#box(
			width: 1fr,
			align(right, typst-repeat(gap: 0.4em, text(size: 20pt, ".")))
		)
		#link(
			it.element.location(),
			box(
				width: max-page-width,
				align(center, text(fill: black)[#it.page()])
			)
		)
	]
}


#outline(
	title: align(center)[
		#v(4em)
		#text(
			font: "Alegreya SC",
			weight: "semibold",
			size: 36pt,
			"Contents"
		)
		#v(1.5em)
	],
	depth: 2,
)
