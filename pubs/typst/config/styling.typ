#let horizontalrule = line(start: (25%,0%), end: (75%,0%))

// the numbers here are just taken from LaTeX's memoir class; I'm not really *this* fussy
#let standard_styles(doc) = {
	let sectionPages = counter("sectionPages")
	let chapterPages = counter("chapterPages")

	set page(
		paper: "us-letter",
		margin: (
			left: 1.0325in,
			right: 1.0325in,
			top: 2.02in,
			bottom: 1.4in,
		),
		// TODO: there's *got* to be a better way to do the page numbers...
		header: context {
			let laterDivisions = query(
				selector(heading.where(level: 1))
				.or(
					selector(heading.where(level: 2))
				).after(here())
			)
			if laterDivisions.len() > 0 {
				let nextDiv = counter(page).at(laterDivisions.first().location()).at(0)
				let currPage = counter(page).get().at(0)
				if nextDiv != currPage [
					#align(right)[#counter(page).display()]
				]
			} else { align(right)[#counter(page).display()] }
		},
		footer: context {
			if chapterPages.get().at(0) == 0 [
				#align(center)[#counter(page).display()]
			]
			sectionPages.step()
			chapterPages.step()
		},
		footer-descent: 0% + 0pt
	)

	set text(
		font: "Alegreya",
		size: 14pt,
		weight: "regular",
	)

	set par(
		justify: true,
		leading: 0.6em,
		spacing: 0.6em,
		first-line-indent: 1.45em,
	)

	show heading.where(level: 1): it => align(horizon + right)[
		#v(-(96pt + 1.2em)) // font size * 2 + spacing * 2
		#text(font: "Alegreya SC", size: 48pt, weight: "semibold", it.body)
		#context sectionPages.update(0)
	]

	show heading.where(level: 2): it => [
		#align(center)[
			#pagebreak()
			#v(4em)
			#par(justify: false, leading: 21pt)[
				#text(font: "Alegreya SC", weight:"semibold", size: 36pt, hyphenate: false, it.body)
			]
			#v(1.15em)
		]
		#linebreak()
		#context chapterPages.update(0)
	]

	show heading.where(level: 3): set text(size: 20pt)
	show heading.where(level: 3): set block(below: 1.1em)

	set list(
		indent: 1.5em,
		spacing: 0.8em,
	)

	show link: set text(fill: rgb(0, 0, 204))

	set table(
		stroke: none,
		inset: (x, y) => {
			if y == 0 {
				(x: 0pt, y: 7.5pt)
			}
			else if y == 1 {
				(x: 0pt, top: 7.5pt, bottom: 4pt)
			}
			// last line bottom inset added in pre-processor
			//   because Typst sadly doesn't have a way to
			//   detect the *last* line :(
			else {
				(x: 0pt, y: 4pt)
			}
		},
		column-gutter: 12pt,
	)

	// table captions show go on top
	show figure.where(
		kind: table
	): set figure.caption(position: top)

	// remove numbering from captions
	//     awaiting the day this can just be a Pandoc flag
	//     (https://github.com/jgm/pandoc/discussions/11191)
	show figure.caption: it => {
		it.body
		v(4.5pt)
	}

	show figure.where(placement: none): it => {
		v(1em)
		it
		v(1em)
	}
	doc
}
