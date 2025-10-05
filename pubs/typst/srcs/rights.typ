#import "/pubs/typst/config/styling.typ"
#show: styling.standard_styles

#set page(
	header: none,
	footer: none,
)

#set par(
	spacing: 1.85em,
	first-line-indent: 0em,
)
#show list: set block(inset: (y: 0em))

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
