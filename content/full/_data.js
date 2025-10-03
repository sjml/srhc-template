export function url(page) {
	if (page.data.layout === false) {
		return `/downloads/${page.data.sitedata.title.replaceAll(" ", "")}.md`;
	}
}
