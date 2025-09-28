export function url(page) {
	if (page.data.layout === false) {
		return `/full/${page.data.sitedata.title.replaceAll(" ", "")}.md`;
	}
}
