import type Site from "lume/core/site.ts";

export function addSectionAnchors() {
	return (site: Site) => {
		site.process([".html"], (pages) => {
			for (const page of pages) {
				[2, 3, 4, 5, 6].forEach(level => {
					const sections = page.document.querySelectorAll(`section.level${level}`);
					sections.forEach(section => {
						const header = section.querySelector(`h${level}:first-child`);
						const anchor = page.document.createElement("a");
						anchor.className = "header-anchor";
						anchor.setAttribute("href", `#${section.id}`);
						anchor.setAttribute("aria-hidden", "true");
						anchor.innerHTML = "§";
						header!.appendChild(anchor);
					});
				});
			}
		});
	};
}
