const onLoad = async () => {
    for (;;) {
        await waitFor(() => document.querySelector('#leaderboarddiv th:not(.srse-header)'));

        const leaderboardTable = document.querySelector('#leaderboarddiv tbody');
        const headerOptions = {};
        let lastContextMenu;

        const reloadVisibility = () => [...leaderboardTable.children].slice(1).forEach(x => {
            x.removeAttribute('hidden');
            document.querySelectorAll('#leaderboarddiv th').forEach((header, i) => {
                if (i < 3) return;
                if (Object.keys(headerOptions).includes(header.innerText)) {
                    if (!headerOptions[header.innerText][x.children[i + 1].innerText.trim()]) {
                        x.setAttribute('hidden', '');
                    }
                }
            });
        });

        document.querySelectorAll('#leaderboarddiv th').forEach((header, i) => {
            header.classList.add('srse-header');
            if (i < 3) return;
            const values = [...leaderboardTable.children].slice(1).map(x => x.children[i + 1].childNodes[0]).map(x => x === undefined ? new Text("") : x);
            if (values.every(x => x instanceof Text) && !['Time'].find(x => header.innerText.includes(x))) {
                const unqiueValues = [...new Set(values.map(x => x.wholeText.trim()))]
                    .sort((a, b) => values.filter(x => b === x.wholeText.trim()).length - values.filter(x => a === x.wholeText.trim()).length);

                headerOptions[header.innerText] = Object.fromEntries(unqiueValues.map(x => [x, true]));

                header.addEventListener('contextmenu', e => {
                    if (lastContextMenu) lastContextMenu.hide();

                    const makeMenuItem = (...parts) => {
                        const menuItem = document.createElement('div');
                        menuItem.classList.add('srse-ctxmenu-item');
                        for (const part of parts) {
                            const partElt = document.createElement('span');
                            partElt.innerText = part;
                            menuItem.appendChild(partElt);
                        }
                        return menuItem;
                    };

                    lastContextMenu = new ContextMenu([
                        {
                            header: makeMenuItem("", "Show All"),
                            action: () => {
                                for (const x in headerOptions[header.innerText]) {
                                    headerOptions[header.innerText][x] = true;
                                }
                                reloadVisibility();
                            }
                        },
                        {
                            header: makeMenuItem("", "Hide All"),
                            action: () => {
                                for (const x in headerOptions[header.innerText]) {
                                    headerOptions[header.innerText][x] = false;
                                }
                                reloadVisibility();
                            }
                        },
                        ...unqiueValues.map(x => ({
                                header: makeMenuItem(headerOptions[header.innerText][x] ? '✓' : '', x === "" ? "𝘕𝘰𝘯𝘦" : x),
                                action: () => {
                                    headerOptions[header.innerText][x] = !headerOptions[header.innerText][x];

                                    reloadVisibility();
                                }
                        }))
                    ]).render(e);

                    e.preventDefault();
                });
            }
        });
    }
};

/* ------------------- */
/* CUSTOM CONTEXT MENU */
/* ------------------- */

class ContextMenu {
    /**
     * 
     * @param {{header: HTMLElement, action: () => boolean}[]} children 
     */
    constructor(children) {
        this.children = children;
    }

    /**
     * 
     * @param {MouseEvent} e 
     */
    render(e) {
        const menuElt = document.createElement('div');
        menuElt.classList.add('srse-ctxmenu');
        menuElt.style.left = `${e.pageX}px`;
        menuElt.style.top = `${e.pageY}px`;

        this.children.forEach(x => {
            const optionElt = x.header.cloneNode(true);
            optionElt.addEventListener('click', _ => {
                if (!x.action()) {
                    this.hide();
                }
            });
            menuElt.appendChild(optionElt);
        });

        document.body.appendChild(menuElt);
        this.elt = menuElt;

        setTimeout(() => {
            this.hideEvent = e => {
                const boundingRect = this.elt.getBoundingClientRect();
                const inRegion = boundingRect.left <= e.x &&
                    boundingRect.right >= e.x &&
                    boundingRect.top <= e.y &&
                    boundingRect.bottom >= e.y;
                if (!inRegion) {
                    this.hide();
                }
            };
            document.addEventListener('mousedown', this.hideEvent);
            document.addEventListener('contextmenu', this.hideEvent);
        }, 0);
    }

    hide() {
        this.elt.remove();
        if (this.hideEvent) {
            document.removeEventListener('mousedown', this.hideEvent);
            document.removeEventListener('contextmenu', this.hideEvent);
            delete this.hideEvent;
        }
    }
}

/* ---------------------- */
/* HELPER FUNCTIONS BELOW */
/* ---------------------- */

/**
 * 
 * @param {() => boolean} pred
 * @param {{
 *  delay?: number,
 *  maxAttempts?: number
 * }} [options]
* @returns {Promise<void>}
*/
const waitFor = (pred, _options) => new Promise((resolve, reject) => {
    const options = {
        delay: 100,
        maxAttempts: -1,
        ..._options
    };
    let attempts = options.maxAttempts;
    const loop = () => {
        if (attempts-- === 0) {
            reject(new Error("Max attempts exceeded."));
        }
        if (pred()) {
            resolve();
        }
        setTimeout(loop, options.delay);
    };
    loop();
});

/**
* 
* @param {string} selector 
* @param {Node} parent 
* @param {(element: HTMLElement) => any} callback 
*/
const observeNewElements = (selector, parent, callback) => {
    const observer = new MutationObserver(muts => {
        const matches = [];
        for (const mut of muts) {
            for (const node of mut.addedNodes) {
                if (node instanceof HTMLElement) {
                    if (node.matches(selector)) {
                        matches.push(node);
                    }
                    matches.push(...node.querySelectorAll(selector));
                }
            }
        }
        const uniqueMatches = matches.reduce((result, next) => result.includes(next) ? result : (result.push(next), result), []);
        uniqueMatches.forEach(match => {
            try {
                callback(match);
            }
            catch (error) {
                console.error(error);
            }
        });
    });

    observer.observe(parent, {
        childList: true,
        subtree: true
    });
    return observer;
};

/* ------- */
/* LOADING */
/* ------- */

if (document.readyState === "complete") {
    onLoad();
}
document.body.onload = onLoad;