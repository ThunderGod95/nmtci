---
layout: default
title: NMTCI Novel - Table of Contents
description: Read the latest chapters of the translated novel.
---

# NMTCI Novel

Welcome to the English translation of [Novel Title]. New chapters added regularly via GitHub.

## Chapters

{% assign chapters = site.static_files | where: "dir", "/translations/" | sort: 'name' %}
<ul>
{% for chapter in chapters %}
  {% if chapter.extname == '.md' %}
    <li><a href="{{ chapter.path | replace: '.md', '.html' }}">{{ chapter.name | replace: '.md', '' | replace: '_', ' ' }}</a></li>
  {% endif %}
{% endfor %}
</ul>

Last updated: {{ site.time | date: '%Y-%m-%d' }}
