-- Retira la siembra inicial.
--
-- `sembrar_organizador()` estaba concedida a cualquier sesión iniciada y su
-- única guarda era "si ya tienes espacios, no hago nada". Una cuenta recién
-- creada —un socio o un cliente entrando por primera vez— podía llamarla y
-- quedarse con su propia copia de los cinco espacios, los dos proyectos y las
-- 23 tareas, siendo su dueño. Además el texto del botón nombraba los espacios,
-- así que revelaba con quién más se trabaja.
--
-- Era un arranque de una sola vez y ya cumplió: la cuenta del dueño está
-- sembrada. Se elimina en lugar de dejarla acotada, porque una función que no
-- se va a volver a usar es superficie de ataque sin contrapartida.

drop function if exists public.sembrar_organizador();
