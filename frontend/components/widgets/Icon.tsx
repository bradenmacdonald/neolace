import React from "react";

// A little type helper to declare 'iconSvg' with correct typing.
function icons<X extends {[iconId: string]: JSX.Element}>(i: X) { return i; }

const iconSvg = icons({
    "arrows-angle-contract": <><path fillRule="evenodd" d="M.172 15.828a.5.5 0 0 0 .707 0l4.096-4.096V14.5a.5.5 0 1 0 1 0v-3.975a.5.5 0 0 0-.5-.5H1.5a.5.5 0 0 0 0 1h2.768L.172 15.121a.5.5 0 0 0 0 .707zM15.828.172a.5.5 0 0 0-.707 0l-4.096 4.096V1.5a.5.5 0 1 0-1 0v3.975a.5.5 0 0 0 .5.5H14.5a.5.5 0 0 0 0-1h-2.768L15.828.879a.5.5 0 0 0 0-.707z"/></>,
    "arrows-angle-expand": <><path fillRule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707z"/></>,
    "aspect-ratio": <>
        <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
        <path d="M2 4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H3v2.5a.5.5 0 0 1-1 0v-3zm12 7a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1 0-1H13V8.5a.5.5 0 0 1 1 0v3z"/>
    </>,
    // We currently use this asterisk symbol to represent a lookup
    "asterisk": <><path d="M8 0a1 1 0 0 1 1 1v5.268l4.562-2.634a1 1 0 1 1 1 1.732L10 8l4.562 2.634a1 1 0 1 1-1 1.732L9 9.732V15a1 1 0 1 1-2 0V9.732l-4.562 2.634a1 1 0 1 1-1-1.732L6 8 1.438 5.366a1 1 0 0 1 1-1.732L7 6.268V1a1 1 0 0 1 1-1z"/></>,
    "blank": <></>,
    "bounding-box": <> <path d="M5 2V0H0v5h2v6H0v5h5v-2h6v2h5v-5h-2V5h2V0h-5v2H5zm6 1v2h2v6h-2v2H5v-2H3V5h2V3h6zm1-2h3v3h-3V1zm3 11v3h-3v-3h3zM4 15H1v-3h3v3zM1 4V1h3v3H1z"/>
    </>,
    "braces-asterisk": <><path fillRule="evenodd" d="M1.114 8.063V7.9c1.005-.102 1.497-.615 1.497-1.6V4.503c0-1.094.39-1.538 1.354-1.538h.273V2h-.376C2.25 2 1.49 2.759 1.49 4.352v1.524c0 1.094-.376 1.456-1.49 1.456v1.299c1.114 0 1.49.362 1.49 1.456v1.524c0 1.593.759 2.352 2.372 2.352h.376v-.964h-.273c-.964 0-1.354-.444-1.354-1.538V9.663c0-.984-.492-1.497-1.497-1.6ZM14.886 7.9v.164c-1.005.103-1.497.616-1.497 1.6v1.798c0 1.094-.39 1.538-1.354 1.538h-.273v.964h.376c1.613 0 2.372-.759 2.372-2.352v-1.524c0-1.094.376-1.456 1.49-1.456v-1.3c-1.114 0-1.49-.362-1.49-1.456V4.352C14.51 2.759 13.75 2 12.138 2h-.376v.964h.273c.964 0 1.354.444 1.354 1.538V6.3c0 .984.492 1.497 1.497 1.6ZM7.5 11.5V9.207l-1.621 1.621-.707-.707L6.792 8.5H4.5v-1h2.293L5.172 5.879l.707-.707L7.5 6.792V4.5h1v2.293l1.621-1.621.707.707L9.208 7.5H11.5v1H9.207l1.621 1.621-.707.707L8.5 9.208V11.5h-1Z"/></>,
    "check-circle-fill": <><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></>,
    "chevron-contract": <><path fillRule="evenodd" d="M3.646 13.854a.5.5 0 0 0 .708 0L8 10.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708zm0-11.708a.5.5 0 0 1 .708 0L8 5.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708z"/></>,
    "chevron-down": <><path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/></>,
    "chevron-expand": <>  <path fillRule="evenodd" d="M3.646 9.146a.5.5 0 0 1 .708 0L8 12.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708zm0-2.292a.5.5 0 0 0 .708 0L8 3.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708z"/></>,
    "chevron-right": <><path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/></>,
    "code": <><path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z"/></>,
    "chevron-up": <><path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/></>,
    "cursor-left-fill": <><path transform="rotate(-90, 8, 8)" d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z"/></>,
    "dash-lg": <><path fillRule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/></>,
    "diamond-fill": <><path fillRule="evenodd" d="M6.95.435c.58-.58 1.52-.58 2.1 0l6.515 6.516c.58.58.58 1.519 0 2.098L9.05 15.565c-.58.58-1.519.58-2.098 0L.435 9.05a1.482 1.482 0 0 1 0-2.098L6.95.435z"/></>,
    "door-closed": <>
        <path d="M3 2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v13h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V2zm1 13h8V2H4v13z"/>
        <path d="M9 9a1 1 0 1 0 2 0 1 1 0 0 0-2 0z"/>
    </>,
    "eraser": <><path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547 3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z"/></>,
    "exclamation-triangle-fill": <><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></>,
    /** We use this one as the symbol of a draft */
    "file-earmark-diff": <>
        <path d="M8 5a.5.5 0 0 1 .5.5V7H10a.5.5 0 0 1 0 1H8.5v1.5a.5.5 0 0 1-1 0V8H6a.5.5 0 0 1 0-1h1.5V5.5A.5.5 0 0 1 8 5zm-2.5 6.5A.5.5 0 0 1 6 11h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5z"/>
        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
    </>,
    "files": <>
        <path d="M13 0H6a2 2 0 0 0-2 2 2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2 2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm0 13V4a2 2 0 0 0-2-2H5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1zM3 4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4z"/>
    </>,
    "image": <>
        <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        <path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/>
    </>,
    "info-circle": <>
        <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
        <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
    </>,
    "journal-text": <>
        <path d="M5 10.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0-2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
        <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z"/>
        <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/>
    </>,
    // "lightning-charge": <><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09zM4.157 8.5H7a.5.5 0 0 1 .478.647L6.11 13.59l5.732-6.09H9a.5.5 0 0 1-.478-.647L9.89 2.41 4.157 8.5z"/></>,
    "list": <><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></>,
    "markdown": <>
        <path d="M14 3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h12zM2 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H2z"/>
        <path fillRule="evenodd" d="M9.146 8.146a.5.5 0 0 1 .708 0L11.5 9.793l1.646-1.647a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 0-.708z"/>
        <path fillRule="evenodd" d="M11.5 5a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 1 .5-.5z"/>
        <path d="M3.56 11V7.01h.056l1.428 3.239h.774l1.42-3.24h.056V11h1.073V5.001h-1.2l-1.71 3.894h-.039l-1.71-3.894H2.5V11h1.06z"/>
    </>,
    "person-fill": <><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></>,
    "plus": <><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></>,
    "plus-lg": <><path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/></>,
    "search": <><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></>,
    "square-fill": <><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2z"/></>,
    "three-dots": <><path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></>,
    "type-bold": <><path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13H8.21zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/></>,
    "type-italic": <><path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/></>,
    "type-strikethrough": <><path d="M6.333 5.686c0 .31.083.581.27.814H5.166a2.776 2.776 0 0 1-.099-.76c0-1.627 1.436-2.768 3.48-2.768 1.969 0 3.39 1.175 3.445 2.85h-1.23c-.11-1.08-.964-1.743-2.25-1.743-1.23 0-2.18.602-2.18 1.607zm2.194 7.478c-2.153 0-3.589-1.107-3.705-2.81h1.23c.144 1.06 1.129 1.703 2.544 1.703 1.34 0 2.31-.705 2.31-1.675 0-.827-.547-1.374-1.914-1.675L8.046 8.5H1v-1h14v1h-3.504c.468.437.675.994.675 1.697 0 1.826-1.436 2.967-3.644 2.967z"/></>,
    // The following two are homemade icons until official ones are made: https://github.com/twbs/icons/issues/386
    "type-subscript": <>
        <g transform="matrix(1,0,0,1,-0.534279,7.14485)">
            <g transform="matrix(14,0,0,14,1.07207,6.11232)">
                <path d="M0.35,-0.316L0.319,-0.388L0.301,-0.434C0.294,-0.45 0.286,-0.467 0.277,-0.486C0.264,-0.513 0.257,-0.528 0.255,-0.533C0.237,-0.575 0.219,-0.596 0.202,-0.596C0.17,-0.596 0.143,-0.565 0.121,-0.503C0.11,-0.506 0.105,-0.513 0.105,-0.524C0.105,-0.555 0.12,-0.588 0.15,-0.624C0.18,-0.659 0.208,-0.677 0.235,-0.677C0.256,-0.677 0.275,-0.665 0.292,-0.64C0.309,-0.616 0.333,-0.565 0.366,-0.488L0.404,-0.395L0.452,-0.479C0.527,-0.611 0.602,-0.676 0.677,-0.676C0.702,-0.676 0.726,-0.671 0.748,-0.661L0.678,-0.59C0.664,-0.598 0.652,-0.602 0.642,-0.602C0.612,-0.602 0.583,-0.586 0.554,-0.553C0.524,-0.521 0.486,-0.462 0.438,-0.376L0.423,-0.349L0.462,-0.255L0.484,-0.205L0.505,-0.156C0.535,-0.086 0.562,-0.052 0.587,-0.052C0.623,-0.052 0.65,-0.08 0.667,-0.136C0.679,-0.131 0.685,-0.124 0.685,-0.115C0.685,-0.1 0.675,-0.078 0.655,-0.048C0.626,-0.003 0.593,0.02 0.556,0.02C0.529,0.02 0.505,0.005 0.484,-0.024C0.463,-0.053 0.434,-0.113 0.396,-0.204L0.369,-0.269L0.358,-0.248C0.264,-0.069 0.17,0.02 0.074,0.02C0.053,0.02 0.031,0.014 0.007,0.003L0.079,-0.066C0.091,-0.06 0.105,-0.056 0.12,-0.056C0.162,-0.056 0.207,-0.089 0.252,-0.154C0.291,-0.208 0.32,-0.256 0.34,-0.297L0.35,-0.316Z" fillRule="nonzero"/>
            </g>
        </g>
        <g transform="matrix(1,0,0,1,3.1407,11.3803)">
            <g transform="matrix(8,0,0,8,7.34558,3.07215)">
                <path d="M0.503,-0.084L0.503,-0L0.03,-0C0.03,-0.021 0.033,-0.042 0.041,-0.061C0.053,-0.093 0.072,-0.125 0.098,-0.156C0.125,-0.188 0.163,-0.224 0.213,-0.265C0.291,-0.328 0.344,-0.379 0.371,-0.416C0.398,-0.454 0.412,-0.489 0.412,-0.522C0.412,-0.557 0.4,-0.586 0.375,-0.61C0.35,-0.634 0.317,-0.646 0.277,-0.646C0.235,-0.646 0.201,-0.633 0.176,-0.608C0.15,-0.583 0.138,-0.547 0.137,-0.502L0.047,-0.512C0.053,-0.579 0.076,-0.63 0.117,-0.666C0.157,-0.701 0.211,-0.719 0.279,-0.719C0.348,-0.719 0.402,-0.7 0.442,-0.662C0.482,-0.624 0.502,-0.576 0.502,-0.52C0.502,-0.491 0.497,-0.463 0.485,-0.436C0.473,-0.408 0.454,-0.379 0.427,-0.348C0.399,-0.318 0.354,-0.276 0.291,-0.222C0.238,-0.178 0.204,-0.148 0.189,-0.132C0.174,-0.116 0.162,-0.1 0.152,-0.084L0.503,-0.084Z" fillRule="nonzero"/>
            </g>
        </g>
    </>,
    "type-superscript": <>
        <g transform="matrix(1,0,0,1,-0.534279,7.14485)">
            <g transform="matrix(14,0,0,14,1.07207,6.11232)">
                <path d="M0.35,-0.316L0.319,-0.388L0.301,-0.434C0.294,-0.45 0.286,-0.467 0.277,-0.486C0.264,-0.513 0.257,-0.528 0.255,-0.533C0.237,-0.575 0.219,-0.596 0.202,-0.596C0.17,-0.596 0.143,-0.565 0.121,-0.503C0.11,-0.506 0.105,-0.513 0.105,-0.524C0.105,-0.555 0.12,-0.588 0.15,-0.624C0.18,-0.659 0.208,-0.677 0.235,-0.677C0.256,-0.677 0.275,-0.665 0.292,-0.64C0.309,-0.616 0.333,-0.565 0.366,-0.488L0.404,-0.395L0.452,-0.479C0.527,-0.611 0.602,-0.676 0.677,-0.676C0.702,-0.676 0.726,-0.671 0.748,-0.661L0.678,-0.59C0.664,-0.598 0.652,-0.602 0.642,-0.602C0.612,-0.602 0.583,-0.586 0.554,-0.553C0.524,-0.521 0.486,-0.462 0.438,-0.376L0.423,-0.349L0.462,-0.255L0.484,-0.205L0.505,-0.156C0.535,-0.086 0.562,-0.052 0.587,-0.052C0.623,-0.052 0.65,-0.08 0.667,-0.136C0.679,-0.131 0.685,-0.124 0.685,-0.115C0.685,-0.1 0.675,-0.078 0.655,-0.048C0.626,-0.003 0.593,0.02 0.556,0.02C0.529,0.02 0.505,0.005 0.484,-0.024C0.463,-0.053 0.434,-0.113 0.396,-0.204L0.369,-0.269L0.358,-0.248C0.264,-0.069 0.17,0.02 0.074,0.02C0.053,0.02 0.031,0.014 0.007,0.003L0.079,-0.066C0.091,-0.06 0.105,-0.056 0.12,-0.056C0.162,-0.056 0.207,-0.089 0.252,-0.154C0.291,-0.208 0.32,-0.256 0.34,-0.297L0.35,-0.316Z" fillRule="nonzero"/>
            </g>
        </g>
        <g transform="matrix(1,0,0,1,3.66893,4.1321)">
            <g transform="matrix(8,0,0,8,7.34558,3.07215)">
                <path d="M0.503,-0.084L0.503,-0L0.03,-0C0.03,-0.021 0.033,-0.042 0.041,-0.061C0.053,-0.093 0.072,-0.125 0.098,-0.156C0.125,-0.188 0.163,-0.224 0.213,-0.265C0.291,-0.328 0.344,-0.379 0.371,-0.416C0.398,-0.454 0.412,-0.489 0.412,-0.522C0.412,-0.557 0.4,-0.586 0.375,-0.61C0.35,-0.634 0.317,-0.646 0.277,-0.646C0.235,-0.646 0.201,-0.633 0.176,-0.608C0.15,-0.583 0.138,-0.547 0.137,-0.502L0.047,-0.512C0.053,-0.579 0.076,-0.63 0.117,-0.666C0.157,-0.701 0.211,-0.719 0.279,-0.719C0.348,-0.719 0.402,-0.7 0.442,-0.662C0.482,-0.624 0.502,-0.576 0.502,-0.52C0.502,-0.491 0.497,-0.463 0.485,-0.436C0.473,-0.408 0.454,-0.379 0.427,-0.348C0.399,-0.318 0.354,-0.276 0.291,-0.222C0.238,-0.178 0.204,-0.148 0.189,-0.132C0.174,-0.116 0.162,-0.1 0.152,-0.084L0.503,-0.084Z" fillRule="nonzero"/>
            </g>
        </g>
    </>,
    "x-lg": <><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></>,
    "zoom-in": <>
        <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
        <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
        <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z"/>
    </>,
    "zoom-out": <>
        <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
        <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
        <path fillRule="evenodd" d="M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
    </>,
});

export type IconId = keyof typeof iconSvg;
export const _allIcons = Object.keys(iconSvg) as IconId[];

interface Props {
    icon?: IconId;
    altText?: string;
}

/**
 * An icon from https://icons.getbootstrap.com/
 * To keep our project's size small, only the icons we are are currently enabled.
 */
export const Icon: React.FunctionComponent<Props> = (props: Props) => {
    return <svg 
        xmlns="http://www.w3.org/2000/svg"
        width="16" height="16"
        fill="currentColor"
        className="w-[1em] h-[1em] inline-block align-[-.125em]"
        viewBox="0 0 16 16"
        {...(props.altText ? {role: "img", "aria-label": props.altText} : {"aria-hidden": true})}
    >
        {iconSvg[props.icon ?? "blank"]}
    </svg>;
}
