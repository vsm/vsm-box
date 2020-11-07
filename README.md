# vsm-box

<!-- badges: start -->
[![Travis build status](https://travis-ci.org/vsm/vsm-box.svg?branch=master)](https://travis-ci.com/vsm/vsm-box)
[![(will become a live badge when codecov can see inside webpack-bundled code)](https://img.shields.io/badge/coverage-high-brightgreen.svg)](https://travis-ci.com/vsm/vsm-box)
[![npm version](https://img.shields.io/npm/v/vsm-box)](https://www.npmjs.com/package/vsm-box)
[![License](https://img.shields.io/npm/l/vsm-box?color=blue)](#license)
[![Downloads](https://img.shields.io/npm/dm/vsm-box)](https://www.npmjs.com/package/vsm-box)
<!-- badges: end -->

## Intro

`vsm-box` is a _web-component_ for entering and showing a _VSM-sentence_.
&nbsp;–&nbsp; Explanation:

- A **VSM-sentence** is a computer-understandable and potentially
  natural-looking statement that consists of _VSM-terms_ and _VSM-connectors_.
  Each term is a one- or few-word text string plus a linked ID.
  The relation between all terms is clarified with just a small set
  of connectors.

- **VSM** (Visual Syntax Method) is an intuitive method to represent any knowledge
  – on any topic, and with any amount of context details – into an elegant form
  that is easy to understand by both humans and computers.  
  _In more detail:_  
  VSM is the combination of a **user-interface** and a **semantic model**,
  that enables people to represent **diverse** and **context-rich**
  knowledge with precision, and that enables them
  to capture this knowledge in a way they find **intuitive** –
  because it closely corresponds to how a piece of knowledge is represented
  in the human mind.  
  VSM is thus a general-purpose method for entering (or 'writing') knowledge in
  a structured, computable form, and for viewing (or 'reading') it in that form.  
  See [vsm.github.io](http://vsm.github.io) for all info on VSM.

- A **web-component** is something that can be shown in a web page by simply
  inserting an HTML-tag, like a `<button>`, `<input>`, or here a `<vsm-box>`.

Target audience:
- For web-developers who embed a vsm-box in a web-app: there are many
  **customization** features to support the needs of various user groups.
- For end-users: a vsm-box is an elegant and flexible interface
  for capturing structured information –
  and esp. easy when they can fill out _VSM-template_ sentences.


<br>

## Intro example – for end users

This is a vsm-box **animated example**. Here, a user:  
• enters two terms (linked to an ID),  
• checks a term's definition etc. by mousehovering so a popup appears,  
• adds a second connector – but by doing so, creates an unintended meaning
  ('chicken with fork')  
  &nbsp; (note also: connectors get auto-sorted for optimal layout),  
• removes that connector again,  
• adds the second connector correctly.

<img src="imgs/vsm-box-example.gif" width="600" alt="vsm-box example animation">

For more examples, see [vsm.github.io](http://vsm.github.io).


<br>

## Intro example – for web developers

A concise example of how to place a vsm-box in a web-app is shown on
[vsm.github.io](http://vsm.github.io), bottom of front page.

More elaborate examples are in the 'index*.html' files in the
[src](https://github.com/vsm/vsm-box/tree/master/src) folder
(see also [Build](#build) below),  
and in the vsm [demo](https://github.com/vsm/demo) repository
(which can be used live [here](https://vsm.github.io/demo)).


<br>

## Documentation

See [Documentation.md](Documentation.md) for full technical details, including:

- VSM-sentence **data-model** (and examples),
- VsmBox input **props** (i.e. html-attributes),
- VsmBox **emitted events**,
- **user interaction**,
- **customized content** (for term labels, term popups, and autocomplete panel
  items).

<br>

## Build

This project's configuration (webpack + npm + Vue + testing + linting) is as
described in
[github.com/stcruy/building-a-reusable-vue-web-component](https://github.com/stcruy/building-a-reusable-vue-web-component).  

This makes `vsm-box` available as:
1)&nbsp;a standalone web-component, 2)&nbsp;a slim web-component,
and 3)&nbsp;a Vue component.

The latest version's built files are available at [unpkg](https://unpkg.com/browse/vsm-box/dist/):
- [vsm-box.standalone.min.js](https://unpkg.com/vsm-box/dist/vsm-box.standalone.min.js)
  &nbsp;(standalone;
  use it like [here](src/index-prod-standalone.html));
- [vsm-box.min.js](https://unpkg.com/vsm-box/dist/vsm-box.min.js)
  &nbsp;(slim, needs Vue etc. as external dependencies;
  use it like [here](src/index-prod-slim.html)).


<br>

## Creators

Created by **[Steven Vercruysse](https://github.com/stcruy)**
(designer of VSM, main developer of vsm-box).  
Contributions (design suggestions or feedback) by:
[Martin Kuiper](https://github.com/makuintnu) (also project guidance and outreach),
[John Zobolas](https://github.com/bblodfon),
[Vasundra Touré](https://github.com/vtoure),
and [Maria K. Andersen](https://github.com/mariakarand).


<br>

## Contributing

See [Contributing.md](CONTRIBUTING.md) for how to submit pull requests,
and a standard text on being nice to other contributors.


<br>

## License

This project is licensed under the [AGPL-3.0 license](LICENSE.md).

The AGPL license gives you the right to use the vsm-box
and other vsm modules for free.
But if you modify the source code, the goal is that you
have to contribute those modifications back to the community.
So *GPL makes software stay _virally_ for-free.

Note* however that it is NOT required that applications' code is
published if, for entering and/or showing VSM-based information,
they use only unchanged, not-augmented vsm modules and/or vsm
data formats.
The copyleft applies only to the vsm-box and other vsm modules.
Your application, even though it talks to vsm-box, is a
separate program and "work".  
*<span style="font-size:smaller;">_(That
is our interpretation and intention with AGPL, similar to how MongoDB does it.
If you know a legally better way to achieve this goal,
let us know.)_</span><br><br>

> _Why AGPL_  
> With VSM, we aim for unification of science's efforts towards digital
> transformation of all its research findings. We want to promote
> community-building, and move forward with everyone together broadening the
> application set.  
> Because the vsm-box software directly reflects the core design of VSM, as a
> shareable semantic-data / knowledge format, we believe that modifications or
> enhancements to it must be made public as well. Otherwise a private actor could
> easily use an "embrace, extend, extinguish" approach to privatize an evolving
> technology that was originally meant to transform our scientific knowledge into
> a more open digital form.  
> We are inspired by the copyleft licensing that contributed to the success of
> Linux-based systems, for the same reason.
> We may revise this policy, if along the way we would learn that a most
> permissive license would give more benefit to society.
