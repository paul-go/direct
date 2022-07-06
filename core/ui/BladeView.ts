
namespace Turf
{
	/** */
	export abstract class BladeView
	{
		/** */
		private static fromJSON(json: object)
		{
			
		}
		
		/** */
		constructor()
		{
			this.root = Htx.div(
				"blade-view",
				
				// Hide the transition configurator for the first blade view
				Htx.css(":first-of-type .transition-configurator { visibility: hidden; }"),
				
				// Controls header
				Htx.div(
					"blade-header",
					{
						display: "flex",
						height: "100px",
						paddingLeft: "25px",
						paddingRight: "25px",
					},
					Htx.div(
						"transition-configurator",
						{
							display: "flex",
							alignItems: "stretch",
							flex: "1 0",
						},
						this.transitionAnchor = Htx.a(
							UI.clickable,
							{
								fontSize: "25px",
							},
							UI.flexVCenter,
							Htx.on(UI.click, () => this.handleTransition())
						),
					),
					Htx.div(
						UI.flexVCenter,
						UI.plusButton(
							() => this.handleAdd(),
						),
					),
					...UI.dripper(
						new Text("Add Here"),
						Htx.on("drop", ev =>
						{
							
						})
					)
				),
				
				//
				this.sceneContainer = Htx.div(
					"scene-container",
					{
						height: UI.vsize(100), 
						backgroundColor: UI.white(0.1),
					},
				),
				
				//
				this.configContainer = Htx.div(
					"config-container",
					{
						display: "flex",
						justifyContent: "center",
						paddingBottom: "20px",
						color: "white",
					}
				),
			);
			
			// Populate this with data in the future.
			this.transition = Transitions.slide;
			
			Controller.set(this);
		}
		
		readonly root: HTMLDivElement;
		readonly sceneContainer;
		readonly configContainer;
		
		/** */
		protected get apex()
		{
			return Controller.over(this, ApexView);
		}
		
		/** */
		protected setBladeButtons(...bladeButtons: BladeButtonView[])
		{
			this.configContainer.append(
				...bladeButtons.map(bb => bb.root),
				this.moreButton.root
			);
		}
		
		private readonly moreButton = new BladeButtonView("•••");
		
		/** */
		private async handleAdd()
		{
			const view = await AddBladeView.show(this.root);
			if (view)
				this.root.insertAdjacentElement("beforebegin", view.root);
		}
		
		/** */
		private handleTransition()
		{
			// Display the transition screen and then set the local property when done
		}
		
		/** */
		get transition()
		{
			return this._transition;
		}
		set transition(value: Animation)
		{
			this._transition = value;
			this.transitionAnchor.innerHTML = `<b>Transition</b>&nbsp;&#8212; ${value.label}`;
		}
		private _transition = Transitions.slide;
		
		private readonly transitionAnchor: HTMLAnchorElement;
		
		/** */
		protected createDripper(title: string, dropFn: (dt: DataTransfer) => void)
		{
			return UI.dripper(
				new Text(title),
				UI.flexCenter,
				{
					backgroundColor: UI.color({ l: 20, a: 0.85 }),
					border: "3px solid " + UI.color({ l: 20 }),
					borderRadius: UI.borderRadius.default,
					fontSize: "40px",
					fontWeight: "700",
					color: "white"
				},
				Htx.on("drop", ev =>
				{
					(ev.target as HTMLElement)?.remove();
					
					if (ev.dataTransfer)
						dropFn(ev.dataTransfer);
				})
			);
		}
		
		/** */
		private closeButton()
		{
			// Close button
			Htx.div(
				"delete-button",
				new Text(UI.mul),
				UI.anchorTopRight(5, 5),
				UI.flexCenter,
				UI.clickable,
				{
					width: "40px",
					height: "40px",
					fontWeight: "900",
					borderRadius: "100%",
					backgroundColor: UI.black(0.5),
					zIndex: "1",
				},
				Htx.on(UI.click, () => this.root.remove())
			);
		}
		
		/** */
		private toJSON()
		{
			return {
				transition: this.transition
			}
		}
	}
}
