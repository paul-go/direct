
namespace App
{
	/** */
	export class LinkEditorView
	{
		constructor()
		{
			this.root = Htx.div(
				"link-editor-view",
				UI.anchorCenter("fit-content"),
				UI.toolButtonTheme,
				{
					top: "auto",
					display: "flex",
					tabIndex: 0
				},
				Htx.css(" > *", {
					padding: "10px 20px",
				}),
				
				Htx.on("focusout", ev =>
				{
					this.finalize(ev);
				},
				{ capture: true }),
				
				Htx.on("keydown", ev =>
				{
					if (ev.key === "Enter")
						this.finalize(ev);
					
				}, { capture: true }),
				
				this.protocolElement = Htx.div(
					"protocol-picker",
					{
						borderTopLeftRadius: "inherit",
						borderBottomLeftRadius: "inherit",
						backgroundColor: UI.white(0.1),
						fontWeight: "700",
					},
					...UI.click(ev => UI.springMenu(ev.target, {
						"https://": () => this.protocol = "https://",
						"http://": () => this.protocol = "http://",
						"mailto: (Email address)": () => this.protocol = "mailto:",
						"tel: (Phone number)": () => this.protocol = "tel:",
					})),
					...UI.text()
				),
				(this.linkTextBox = this.createLinkTextBox()).root
			);
			
			Cage.set(this);
		}
		
		readonly root;
		private readonly linkTextBox;
		private readonly protocolElement;
		
		/** */
		private createLinkTextBox()
		{
			const box = new TextBox();
			box.placeholder = "Enter the link URL";
			box.editableElement.style.minWidth = "200px";
			return box;
		}
		
		/**
		 * Gets or sets the complete link text displayed in this LinkEditorView,
		 * including both the protocol and the non-protocol areas.
		 */
		get link()
		{
			// This code accounts for the fact that the user may have entered
			// the protocol into the non-protocol text box area (which will be 
			// common if they're pasting in a link)
			const [maybeProtocol, splitNonProtocol] = splitLink(this.nonProtocol);
			const protocol = maybeProtocol || this.protocol;
			return protocol + splitNonProtocol;
		}
		set link(link: string)
		{
			const [splitProtocol, splitNonProtocol] = splitLink(link);
			this.protocol = splitProtocol || "https://";
			this.nonProtocol = splitNonProtocol;
		}
		
		/** */
		get protocol()
		{
			return this.protocolElement.textContent || "";
		}
		set protocol(protocol: string)
		{
			this.protocolElement.textContent = protocol;
		}
		
		/** */
		private get nonProtocol()
		{
			return this.linkTextBox.text;
		}
		private set nonProtocol(value: string)
		{
			this.linkTextBox.html = value;
		}
		
		/** */
		setCommitFn(fn: (link: string) => void)
		{
			this.commitFn = fn;
		}
		private commitFn?: (link: string) => void;
		
		/** */
		focus()
		{
			this.linkTextBox.focus();
		}
		
		/** */
		private finalize(ev: Event)
		{
			this.commitFn?.(this.link);
			ev.preventDefault();
			ev.stopImmediatePropagation();
		}
	}
	
	/** */
	function splitLink(link: string): [string, string]
	{
		let protocol = "";
		
		for (const proto of protocols)
		{
			if (link.startsWith(proto))
			{
				link = link.slice(proto.length);
				protocol = proto;
				break;
			}
		}
		
		return [protocol, link]
	}
	
	const protocols = ["https://", "http://", "mailto:", "tel:"] as const;
}