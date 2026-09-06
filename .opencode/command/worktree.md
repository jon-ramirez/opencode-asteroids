---
description: Crea un git worktree en .worktrees/ con el nombre indicado (sin cambiar a él)
agent: build
---

Ejecuta exactamente este comando de bash con el primer argumento recibido,
sin leer archivos ni hacer nada más:

git worktree add .worktrees/$1

Si no se recibió ningún nombre, pregunta al usuario cuál quiere usar antes
de ejecutar nada. Muestra la salida del comando; si falla, informa del
error sin intentar alternativas.

El comando solo crea el worktree: no te cambies a él, no modifiques el
directorio de trabajo de la sesión ni ejecutes ningún comando adicional
dentro del worktree.
