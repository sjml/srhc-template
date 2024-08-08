export default function (eleventyConfig) {
  eleventyConfig.addFilter("navFilter", function(navCollection) {
    return navCollection.filter(p => !p.data.no_nav);
  });

  // these two filters are to support getting the previous and next
  //   pages from the navigation collection, which should be built-in
  //   behavior, but who am I to say
  // TODO submit a PR to eleventy-navigation:
  //    getNavCollectionItem
  //    getPreviousNavCollectionItem
  //    getNextNavCollectionItem
  eleventyConfig.addFilter("flattenNav", function(navCollection) {
    navCollection = navCollection.sort((a,b) => a.key.localeCompare(b.key));

    const flattened = [];
    function explore(entries) {
      for (const e of entries) {
        flattened.push(e);
        explore(e.children);
      }
    }
    explore(navCollection);
    for (let i=0; i < flattened.length; i++) {
      const e = flattened[i];
      e.prev = flattened[i-1];
      e.next = flattened[i+1];
    }
    return flattened;
  });

  eleventyConfig.addFilter("getNavPage", function(navCollection, pageUrl) {
    for (let p of navCollection) {
      if (p.url === pageUrl) {
        return p;
      }
    }
  });

  eleventyConfig.addFilter("getRealPage", function(coll, pageUrl) {
    for (let p of coll) {
      if (p.url === pageUrl) {
        return p;
      }
    }
  });
}
