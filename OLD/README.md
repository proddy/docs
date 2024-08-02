# EMS-ESP Documentation

This is the official documentation for EMS-ESP and hosted on https://emsesp.github.io/docs/

Built on [MkDocs](https://www.mkdocs.org/) using [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) theme and borrowed from [Tasmota](https://github.com/tasmota/docs/tree/master).

## Editing Articles

Edit only articles in `/docs` folder.

All paths are relative.

Use strict markdown syntax. See [Markdown Cheatsheet](https://www.markdownguide.org/cheat-sheet/) for a quick reference.

### Markdown Enhancements

#### Admonitions

[Reference](https://squidfunk.github.io/mkdocs-material/reference/admonitions/) of all possibilities

#### Definition Lists

[Usage](https://squidfunk.github.io/mkdocs-material/reference/lists/#using-definition-lists)

#### Tabs

Start each tab section with `=== "Tab title"` and indent the tab content by 4 spaces. [More information...](https://facelessuser.github.io/pymdown-extensions/extensions/tabbed/)

#### Warnings/Tips

```
!!! tip
    A tip

!!! warning
    A warning

!!! info "some info"

!!! note
    just a note
```

#### Superscript text

Enclose text in `^ ^` to superscript it. Example `H^2^0` renders H<sup>2</sup>O

## Installing

Easiest way is to run pip as a module (https://realpython.com/what-is-pip/#using-pip-in-a-python-virtual-environment). On Linux to install pip and this projects dependencies use:

- `python3 -m venv venv` to create the virtual environment
- `source ./venv/bin/activate` to enter it
- `pip install wheel` and `pip install -r requirements.txt` to install the libraries

### Testing locally

- `source ./venv/bin/activate` to go into the virtual environment
- `pip install -r requirements.txt` to refresh latest libs
- `mkdocs serve` to build the documentation
- <http://127.0.0.1:8000/docs>
- TIP: comment out the `git-committers` in `mkdocs.yml` to speed up the build

## Deploying manually

The GitHub actions take care of the re-deployments, but if you want to force it you can use:

`mkdocs gh-deploy --force --strict`
