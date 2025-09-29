## fundaments
* check out typst instead of latex? 
  * at this point, wait until there's a new Pandoc release that does syntax highlighting (https://github.com/jgm/pandoc/commit/3ffd47af68853662fc613c3ce186e60b60d95d43)
  * generateCodeHighlightingStyle would need to be adapted
  * should run with `--ignore-system-fonts`
* can copyright info come from the site data? (in the tex templates, etc.)
  * epub metadata.md file
* accessibility for ToC toggle and theme selector
* `code` spacing should change for print layout where the gray disappears (maybe outline instead?)
* copy over full Markdown file?
  * lume wants to turn it into a webpage if it's in the downloads folder :-/; maybe adding it directly will fix?
  * maybe rethink the environment flag handling at this point
