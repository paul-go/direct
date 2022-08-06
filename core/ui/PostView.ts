
namespace App
{
	/** */
	export class PostView
	{
		/**
		 * Creates a new PostView instance, which is populated with data
		 * from the specified PostRecord. If the PostRecord argument is
		 * omitted, this indicates that this PostView should create it a new, 
		 * unsaved record.
		 */
		constructor(record?: PostRecord)
		{
			this.record = record || (() =>
			{
				const post = new PostRecord();
				post.slug = Util.generatePostSlug();
				return post;
			})();
			
			this.isNewRecord = !record;
			
			this.root = Htx.div(
				"post-view",
				Htx.on(window, "scroll", () => this.toggleHeader(window.scrollY > 0)),
				
				UI.anchorTop(),
				{
					minHeight: "100vh",
					paddingBottom: "10px",
					transitionDuration: "0.5s",
					transitionProperty: "transform, opacity",
					transformOrigin: "0 0",
					opacity: "1",
				},
				minHeight,
				this.scenesElement = Htx.div(
					"scenes-element",
					minHeight,
				),
				
				Htx.div(
					"no-scenes-message",
					UI.anchor(),
					UI.flexCenter,
					UI.visibleWhenEmpty(this.scenesElement),
					minHeight,
					{
						zIndex: "1",
					},
					(this.noScenesBox = new HeightBox(this.renderNoScenes())).root,
				),
				
				this.footerElement = Htx.div(
					"footer",
					{
						width: "fit-content",
						minWidth: "400px",
						margin: "auto",
						padding: "0 20px",
					},
					UI.visibleWhenNotEmpty(this.scenesElement),
					
					UI.actionButton(
						"filled",
						{ maxWidth: "400px" },
						...UI.click(() => this.handlePreview()),
						new Text("Preview")
					),
					UI.clickLabel(
						"publish-button",
						{
							margin: "10px auto",
							padding: "20px",
							width: "min-content",
						},
						Htx.on(UI.clickEvt, () =>
						{
							this.tryPublish();
						}),
						...UI.text("Publish", 25, 800),
					),
					this.publishInfoElement = Htx.div("publish-info")
				),
				
				this.headerScreen = Htx.div(
					"header-screen",
					{
						position: "fixed",
						top: "0",
						left: "0",
						borderBottomRightRadius: UI.borderRadius.large,
						height: SceneView.headerHeight,
						transitionDuration: "0.33s",
						transitionProperty: "background-color",
						padding: "25px",
						// Elevate the chevron so that it goes above the "no scenes" message
						zIndex: "1",
					},
					UI.clickable,
					Htx.on("click", () => this.handleBack()),
					UI.chevron(
						Origin.left,
						TAURI && {
							width: "20px",
							height: "20px",
							top: "20px",
							left: "3px"
						},
						!TAURI && {
							top: "12px",
							left: "5px",
						},
					),
				),
			);
			
			this.scenes = new Controller.Array(this.scenesElement, SceneView);
			this.scenes.insert(...this.record.scenes.map(b => SceneView.new(b)));
			this.scenes.observe(() =>
			{
				this.footerElement.style.display = this.scenes.length > 0 ? "block" : "none";
				this.save();
			});
			
			this.updatePublishInfo();
			
			Controller.set(this);
		}
		
		readonly root;
		readonly scenes;
		private readonly record;
		private readonly headerScreen;
		private readonly scenesElement;
		private readonly footerElement;
		private readonly noScenesBox;
		private readonly isNewRecord: boolean;
		private publishInfoElement;
		
		/** */
		private renderNoScenes()
		{
			return Htx.div(
				"add-first-scene",
				Htx.div(
					UI.presentational,
					{
						fontSize: "30px",
						fontWeight: "600",
						marginBottom: "30px",
					},
					new Text("This post has no scenes."),
				),
				UI.actionButton("filled", 
					{
						marginTop: "10px",
					},
					Htx.on(UI.clickEvt, () =>
					{
						const ibv = new InsertSceneView("v");
						ibv.setCancelCallback(() => this.noScenesBox.back());
						ibv.setInsertCallback(scene =>
						{
							this.scenesElement.append(scene.root);
						});
						this.noScenesBox.push(ibv.root);
					}),
					new Text("Add One"),
				)
			);
		}
		
		/** */
		private save()
		{
			this.record.scenes = this.scenes
				.toArray()
				.map(view => view.record);
		}
		
		/** */
		setKeepCallback(fn: (post: PostRecord) => void)
		{
			this.keepFn = fn;
		}
		private keepFn = (post: PostRecord) => {};
		
		/** */
		setBackCallback(fn: () => void)
		{
			this.backFn = fn;
		}
		private backFn = () => {};
		
		/** */
		private toggleHeader(visible: boolean)
		{
			Htx.from(this.headerScreen)(
				{ backgroundColor: visible ? UI.gray(128, 0.25) : "transparent" },
				UI.backdropBlur(visible ? 8 : 0)
			);
		}
		
		/** */
		private async handleBack()
		{
			this.save();
			
			// If there is no BlogView sitting behind this PostView, its because
			// the application launched directly into a PostView for editing the
			// home page, and so we need to insert a new BlogView.
			if (Query.find(CssClass.blogView, AppContainer.of(this).root).length === 0)
			{
				const blogView = new BlogView();
				const app = AppContainer.of(this);
				app.root.prepend(blogView.root);
				await UI.wait();
				const s = this.root.style;
				s.opacity = "0";
				s.transform = "scale(0.3333)";
				await UI.waitTransitionEnd(this.root);
				this.root.remove();
			}
			else
			{
				if (this.isNewRecord && this.scenes.length > 0)
					this.keepFn(this.record);
				
				this.backFn();
			}
		}
		
		/** */
		private handlePreview()
		{
			const meta = AppContainer.of(this).meta;
			new PreviewView(this.record, meta);
		}
		
		/** */
		private tryPublish()
		{
			const app = AppContainer.of(this);
			const meta = app.meta;
			const publisher = Publisher.getCurrentPublisher(this.record, meta);
			
			if (publisher?.canPublish())
				publisher.publish();
			else
				this.setupPublish();
		}
		
		/** */
		private setupPublish()
		{
			const app = AppContainer.of(this);
			const publishSetupView = new PublishSetupView(this.record, app);
			this.root.append(publishSetupView.root);
		}
		
		/** */
		async updatePublishInfo()
		{
			When.connected(this.publishInfoElement, () =>
			{
				const meta = AppContainer.of(this).meta;
				const publisher = Publisher.getCurrentPublisher(this.record, meta);
				const dstText = publisher?.getPublishDestinationUI() || "";
				
				this.publishInfoElement.replaceWith(this.publishInfoElement = Htx.div(
					"publish-info",
					{
						height: "1.6em",
						margin: "40px 0",
						color: UI.white(0.5),
						textAlign: "center",
					},
					
					dstText && UI.settingsIcon(
						{
							position: "absolute",
							right: "-1.5em",
							width: "30px",
							height: "30px",
						},
						...UI.click(() => this.setupPublish())
					),
					
					dstText && Htx.span(
						...UI.text("Publish to: ", 24, 600)
					),
					
					dstText && Htx.span(
						{
							maxWidth: "8em",
							verticalAlign: "bottom",
							overflow: "hidden",
							display: "inline-block",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							fontSize: "24px",
							fontWeight: "800",
						},
						dstText
					),
				))
			});
		}
	}
	
	const minHeight: Htx.Param = { minHeight: "85vh" };
}