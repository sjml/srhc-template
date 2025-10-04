

%_page.pdf: %.typ
	typst compile --root ../../../ --font-path ../../../resources/fonts/ --ignore-system-fonts $< $@

all: title_page.pdf rights_page.pdf
