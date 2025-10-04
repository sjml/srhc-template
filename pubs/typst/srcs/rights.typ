#set page(
	paper: "us-letter",
	margin: (
		left: 1.0325in,
		right: 1.0325in,
	)
)

#set text(
	font: "Alegreya",
	size: 14pt,
	weight: "regular"
)

#set par(
	justify: true,
	leading: 0.57em,
	spacing: 1.85em,
)

#set list(
	indent: 1.5em,
	spacing: 0.8em,
)

#show link: set text(fill: rgb(0, 0, 204))

#align(horizon)[
	©2025 by #link("https://example.com")[Lorem Ipsum];.
	#v(10mm)
	#image("../../../resources/licensing/by-nc-sa.svg")

	This book is licensed under a
	#link("http://creativecommons.org/licenses/by-nc-sa/4.0/")[Creative Commons\
	Attribution-NonCommercial-ShareAlike 4.0 International License];.

	You are free to:
	- #strong[Share] --- copy and redistribute the material in any medium or format
	- #strong[Adapt] --- remix, transform, and build upon the material

	Under the following terms:
	- #strong[Attribution] --- You must give appropriate credit, provide a link to the license, and indicate if changes were made. You may do so in any reasonable manner, but not in any way that suggests the licensor endorses you or your use.
	- #strong[NonCommercial] --- You may not use the material for commercial purposes.
	- #strong[ShareAlike] --- If you remix, transform, or build upon the material, you must distribute your contributions under the same license as the original.

	#strong[No additional restrictions] --- You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

	#v(10mm)

	#align(center)[The latest version of the text is freely available at\
	#link("https://example.com/nlen/")]
]
