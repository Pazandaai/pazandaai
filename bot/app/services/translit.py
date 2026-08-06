import re

_PROTECT_RE = re.compile(r"(<[^>]*>|https?://\S+)")

_LAT_MULTI = [
    ("g'", "ғ"),
    ("g‘", "ғ"),
    ("g’", "ғ"),
    ("gʻ", "ғ"),
    ("o'", "ў"),
    ("o‘", "ў"),
    ("o’", "ў"),
    ("oʻ", "ў"),
    ("sh", "ш"),
    ("ch", "ч"),
    ("yo", "ё"),
    ("yu", "ю"),
    ("ya", "я"),
]

_LAT_SINGLE = {
    "a": "а",
    "b": "б",
    "c": "с",
    "d": "д",
    "e": "е",
    "f": "ф",
    "g": "г",
    "h": "ҳ",
    "i": "и",
    "j": "ж",
    "k": "к",
    "l": "л",
    "m": "м",
    "n": "н",
    "o": "о",
    "p": "п",
    "q": "қ",
    "r": "р",
    "s": "с",
    "t": "т",
    "u": "у",
    "v": "в",
    "x": "х",
    "y": "й",
    "z": "з",
}

_CYR_MULTI = [
    ("ғ", "g'"),
    ("ў", "o'"),
    ("ш", "sh"),
    ("ч", "ch"),
    ("ё", "yo"),
    ("ю", "yu"),
    ("я", "ya"),
]

_CYR_SINGLE = {
    "а": "a",
    "б": "b",
    "в": "v",
    "г": "g",
    "д": "d",
    "е": "e",
    "ж": "j",
    "з": "z",
    "и": "i",
    "й": "y",
    "к": "k",
    "л": "l",
    "м": "m",
    "н": "n",
    "о": "o",
    "п": "p",
    "р": "r",
    "с": "s",
    "т": "t",
    "у": "u",
    "ф": "f",
    "х": "x",
    "ҳ": "h",
    "қ": "q",
    "э": "e",
    "ъ": "",
    "ь": "",
}


def _apply_pairs(text: str, pairs: list[tuple[str, str]]) -> str:
    for src, dst in pairs:
        pattern = re.compile(re.escape(src), re.IGNORECASE)

        def make_repl(target_repl: str):
            def repl_func(match: re.Match) -> str:
                original = match.group(0)
                if not original:
                    return target_repl
                if original[0].isupper():
                    return target_repl.upper() if original.isupper() else target_repl.capitalize()
                return target_repl

            return repl_func

        text = pattern.sub(make_repl(dst), text)

    return text


def _map_single(text: str, mapping: dict[str, str]) -> str:
    result = []
    for ch in text:
        lower = ch.lower()
        if lower in mapping:
            mapped = mapping[lower]
            result.append(mapped.upper() if ch.isupper() else mapped)
        else:
            result.append(ch)
    return "".join(result)


def _lat_to_cyr_raw(text: str) -> str:
    text = _apply_pairs(text, _LAT_MULTI)
    text = _map_single(text, _LAT_SINGLE)
    return text


def _cyr_to_lat_raw(text: str) -> str:
    text = _apply_pairs(text, _CYR_MULTI)
    text = _map_single(text, _CYR_SINGLE)
    return text


def _protected_convert(text: str, converter) -> str:
    parts = _PROTECT_RE.split(text)
    result = []

    for part in parts:
        if not part:
            continue

        if (part.startswith("<") and part.endswith(">")) or part.startswith(
            ("http://", "https://")
        ):
            result.append(part)
        else:
            result.append(converter(part))

    return "".join(result)


def to_cyr(text: str) -> str:
    return _protected_convert(text, _lat_to_cyr_raw)


def to_lat(text: str) -> str:
    return _protected_convert(text, _cyr_to_lat_raw)
