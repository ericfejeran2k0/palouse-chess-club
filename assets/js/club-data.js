---
# This file is filled in automatically from _config.yml, _data/events.yml
# and _data/puzzles.yml. You don't need to edit it.
---
window.CLUB = {
  meetings: {
    weeksOfMonth: {{ site.meetings.weeks_of_month | jsonify }},
    weekday: {{ site.meetings.weekday | jsonify }},
    startTime: {{ site.meetings.start_time | jsonify }},
    endTime: {{ site.meetings.end_time | jsonify }},
    timeText: {{ site.meetings.time_text | jsonify }}
  },
  location: {{ site.location | jsonify }},
  events: [
    {%- for e in site.data.events -%}
    {%- if e.date %}
    {
      date: {{ e.date | date: "%Y-%m-%d" | jsonify }},
      title: {{ e.title | default: "Special event" | jsonify }},
      time: {{ e.time | jsonify }},
      location: {{ e.location | jsonify }},
      description: {{ e.description | jsonify }},
      link: {{ e.link | jsonify }},
      cancel: {% if e.cancel == true or e.cancel == "yes" or e.cancel == "true" %}true{% else %}false{% endif %}
    },
    {%- endif -%}
    {%- endfor %}
  ],
  puzzles: [
    {%- for p in site.data.puzzles %}
    {
      title: {{ p.title | jsonify }},
      position: {{ p.position | strip | jsonify }},
      task: {{ p.task | jsonify }},
      solution: {{ p.solution | strip | jsonify }},
      explanation: {{ p.explanation | jsonify }}
    },
    {%- endfor %}
  ]
};
