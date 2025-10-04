## fundaments
* check out typst instead of latex? 
  * generateCodeHighlightingStyle would need to be adapted
  * should run with `--ignore-system-fonts`
  * lang tags? typst has its own... `#set text(lang: "de")`
  * table formatting
  * figure and table numbering, BOO
    * ```
      const output = input.replace(
        /(#figure\([\s\S]*?,\s*kind:\s*table)(\s*\))/g,
        `$1\n  , numbering: none$2`
      );
      ```
    * OR: https://github.com/jgm/pandoc/discussions/11191
  * update GitHub action
    * https://github.com/marketplace/actions/setup-typst
* can copyright info come from the site data? (in the tex templates, etc.)
  * epub metadata.md file
* JSON-LD?
