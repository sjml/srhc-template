export default {
  layout: "page",
  eleventyComputed: {
    eleventyNavigation: {
      key: (data) => data.page.url,
      order: (data) => data.order,
      title: (data) => data.title,
      parent: (data) => {
        if (data.no_nav) {
          return undefined;
        }
        if (data.page.url === undefined || data.page.url.length <= 1) {
          return undefined;
        }
        const urlElements = data.page.url.replace(/^\/|\/$/g, "").split("/");
        if (urlElements[urlElements.length-1] !== data.page.fileSlug) {
          throw new Error(`File slug doesn't match final path element. ("${data.page.url}" and "${data.page.fileSlug}")`);
        }
        urlElements.pop();
        if (urlElements.length > 0) {
          return `/${urlElements.join("/")}/`;
        }
        else {
          return undefined;
        }
      }
    }
  }
}
