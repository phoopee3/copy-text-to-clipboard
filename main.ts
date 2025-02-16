import { Plugin, Notice } from 'obsidian';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

export default class WrapTextPlugin extends Plugin {
    onload() {
        // Load the plugin in the editor
        this.registerEditorExtension(this.wrapTextExtension());

        // Load the plugin in the reader mode
        this.registerMarkdownPostProcessor((element, context) => {
            this.convertTextToButton(element);
        });
    }

    wrapTextExtension() {
        return ViewPlugin.fromClass(class {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView) {
                const builder = new RangeSetBuilder<Decoration>();
                const regex = /\{\!(.*?)\!\}/g;

                for (let { from, to } of view.visibleRanges) {
                    let text = view.state.doc.sliceString(from, to);
                    let match;
                    while ((match = regex.exec(text)) !== null) {
                        const start = from + match.index;
                        const end = start + match[0].length;
                        const buttonId = `copy-button-${Math.random().toString(36).substr(2, 9)}`;
                        const deco = Decoration.widget({
                            widget: new ButtonWidget(match[1], buttonId),
                            side: 1
                        });
                        builder.add(start, end, deco);
                    }
                }

                return builder.finish();
            }
        }, {
            decorations: v => v.decorations
        });
    }

    convertTextToButton(element: HTMLElement) {
        const regex = /\{\!(.*?)\!\}/g;
        element.innerHTML = element.innerHTML.replace(regex, (match, p1) => {
            const buttonId = `copy-button-${Math.random().toString(36).substr(2, 9)}`;
            setTimeout(() => {
                const button = document.getElementById(buttonId);
                if (button) {
                    button.addEventListener('click', () => {
                        navigator.clipboard.writeText(p1).then(() => {
                            console.log('Text copied to clipboard');
                        }).catch(err => {
                            console.error('Failed to copy text: ', err);
                        });
                    });
                }
            }, 0);
            return `<button id="${buttonId}" class="copy-button" style="white-space:normal;display:inline-block;height:auto;padding-bottom:5px;text-align:left;">${p1}</button>`;
        });
    }
}

class ButtonWidget extends WidgetType {
    constructor(private text: string, private buttonId: string) {
        super();
    }

    toDOM() {
        const button = document.createElement('button');
        button.id = this.buttonId;
        button.className = 'copy-button';
        button.textContent = this.text;
        button.style.whiteSpace = 'normal';
        // button.style.wordWrap = 'break-word';
        button.style.display = 'inline-block';
        button.style.height = 'auto';
        button.style.paddingBottom = '5px';
        button.style.textAlign = 'left';
        button.onclick = () => {
            navigator.clipboard.writeText(this.text).then(() => {
                console.log('Text copied to clipboard');
                new Notice('Text copied to clipboard');
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                new Notice('Failed to copy text');
            });
        };
        return button;
    }

    ignoreEvent() {
        return false;
    }
}