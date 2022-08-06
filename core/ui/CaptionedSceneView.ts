
/** */
namespace App
{
	/** */
	export class CaptionedSceneView extends SceneView
	{
		/** */
		constructor(readonly record = new CaptionedSceneRecord())
		{
			super(record);
			
			this.titleView = new CaptionedTitleView();
			this.descriptionView = new CaptionedDescriptionView();
			this.buttonsContainer = Htx.div("buttons");
			this.buttons = new Controller.Array(this.buttonsContainer, CaptionedButton);
			
			Htx.from(this.sceneContainer)(
				...UI.dripper(
					Htx.div(
						UI.dripperStyle("top"),
						new Text("Add Content Image")
					),
					Htx.div(
						UI.dripperStyle("bottom"),
						new Text("Add Background Image")
					),
					onFileDrop((files, x, y) => this.handleMediaDrop(files, x, y)),
				),
				this.backgroundsContainer = Htx.div(
					"backgrounds-container",
					UI.anchor()
				),
				this.foregroundContainer = new ForegroundView(
					this.record,
					CssClass.captionSceneForeground,
					this.record.origin,
					this.textContainer = Htx.div(
						"text-container",
						this.contentImageContainer = Htx.div("content-image-container"),
						this.titleView.root,
						this.descriptionView.root,
						this.buttonsContainer,
					)
				).root,
				
				this.createToolsHeader(
					...this.createToolButtons()
				)
			);
			
			this.setSceneButtons(
				() => this.handleSelectionChange(),
				//this.animationButton,
				this.originButton,
				this.sizeButton,
				this.weightButton,
				this.contrastButton,
				this.backgroundsButton,
			);
			
			this.backgroundManager = new BackgroundManager(
				this.record,
				this.backgroundsContainer);
			
			this.setContentImageSize(this.record.contentImageWidth);
			
			this.titleView.setTitles(this.record.titles);
			this.titleView.setTextChangedHandler(() =>
			{
				this.record.titles = this.titleView.getTitleData();
			});
			
			this.descriptionView.setTextChangedHandler(() =>
			{
				this.record.description = this.descriptionView.html;
			});
			
			this.setDescriptionText(this.record.description);
			this.setDescriptionSize(this.record.descriptionSize);
			this.setContrast(this.record.textContrast);
		}
		
		private readonly foregroundContainer;
		private readonly textContainer;
		private readonly contentImageContainer;
		private contentImage: HTMLImageElement | null = null;
		private readonly titleView;
		private readonly descriptionView;
		private readonly buttonsContainer;
		private readonly buttons;
		private readonly backgroundsContainer;
		private readonly backgroundManager: BackgroundManager;
		
		private sizePicker: ElementPicker | null = null;
		private weightPicker: ElementPicker | null = null;
		private originPicker: OriginPicker | null = null;
		
		private readonly animationButton = new SceneButtonView("Animation");
		private readonly originButton = new SceneButtonView("Position");
		private readonly sizeButton = new SceneButtonView("Size");
		private readonly weightButton = new SceneButtonView("Bold");
		private readonly contrastButton = new SceneButtonView("Contrast");
		private readonly backgroundsButton = new SceneButtonView("Backgrounds");
		
		/** */
		private createToolButtons()
		{
			const imageTool = this.createToolButton("+ Image", () => this.beginAddContentImage());
			const titleTool = this.createToolButton("+ Title", () => this.titleView.focus());
			const descTool = this.createToolButton("+ Description", () => this.descriptionView.focus());
			
			this.titleView.setHideChangedHandler(hidden => UI.toggle(titleTool, hidden));
			this.descriptionView.setHideChangedHandler(hidden => UI.toggle(descTool, hidden));
			
			return [
				imageTool,
				titleTool,
				descTool,
			];
		}
		
		/** */
		private addButton()
		{
			const cb = new CaptionedButton();
			this.buttons.insert(cb);
			
			// It's lame that this is in a setTimeout, but I don't care.
			// It's not working otherwise.
			setTimeout(() => cb.focus());
		}
		
		/** */
		private async beginAddContentImage()
		{
			if (TAURI)
			{
				const dialogResult = await Tauri.dialog.open({
					recursive: false,
					directory: false,
					multiple: false,
					filters: [{
						name: "Images",
						extensions: ["jpg", "jpeg", "gif", "png", "svg"]
					}]
				});
				
				if (typeof dialogResult !== "string")
					return;
				
				const fileName = Util.getFileName(dialogResult);
				const imageBytes = await Tauri.fs.readBinaryFile(dialogResult);
				const mime = MimeType.fromFileName(fileName);
				const fileLike = new FileLike(fileName, mime, imageBytes);
				const mediaRecord = this.createMediaRecords([fileLike]);
				this.addContentImage(mediaRecord[0]);
			}
			else
			{
				const input = Htx.input(
					{
						type: "file",
						visibility: "hidden",
						position: "absolute",
						multiple: false,
						accept: [MimeType.gif, MimeType.jpg, MimeType.png, MimeType.svg].join()
					},
					Htx.on("change", async () =>
					{
						input.remove();
						
						if (input.files?.length)
						{
							const nativeFile = input.files[0];
							const fileLike: FileLike = { 
								name: nativeFile.name,
								data: await nativeFile.arrayBuffer(),
								type: Not.nullable(MimeType.from(nativeFile.type))
							};
							
							const mediaRecord = this.createMediaRecords([fileLike]);
							this.addContentImage(mediaRecord[0]);
						}
					})
				);
				
				document.body.append(input);
				input.click();
			}
		}
		
		/** */
		private handleMediaDrop(files: FileLike[], layerX: number, layerY: number)
		{
			const mediaRecords = this.createMediaRecords(files, [MimeClass.image, MimeClass.video]);
			if (mediaRecords.length === 0)
				return;
			
			const mediaRecord = mediaRecords[0];
			const isBackground = layerY > this.sceneContainer.offsetHeight / 2;
			
			if (isBackground)
				this.backgroundManager.addBackground(mediaRecord);
			else
				this.addContentImage(mediaRecord);
		}
		
		/** */
		private async addContentImage(mediaRecord: MediaRecord)
		{
			const src = mediaRecord.getBlobUrl();
			const [width, height] = await RenderUtil.getDimensions(src);
			
			this.contentImage = Htx.img(CssClass.captionSceneContentImage, { src });
			this.contentImage.style.aspectRatio = width + " / " + height;
			this.contentImageContainer.replaceChildren(this.contentImage);
			this.setContentImageSize(15);
		}
		
		/** */
		private handleSelectionChange()
		{
			if (this.sizeButton.selected)
				this.renderSizeConfigurator();
			else
				this.sizePicker?.remove();
			
			if (this.weightButton.selected)
				this.renderWeightConfigurator();
			else
				this.weightPicker?.remove();
			
			if (this.contrastButton.selected)
				this.renderContrastConfigurator();
			
			if (this.originButton.selected)
			{
				this.renderOriginConfigurator();
				this.setSceneConfigurator(null);
			}
			else this.originPicker?.remove();
			
			if (this.backgroundsButton.selected)
			{
				this.foregroundContainer.style.filter = "blur(3px)";
				this.foregroundContainer.style.pointerEvents = "none";
				this.setSceneConfigurator(this.backgroundManager.configuratorElement);
			}
			else
			{
				this.foregroundContainer.style.removeProperty("filter");
				this.foregroundContainer.style.removeProperty("pointer-events");
				this.backgroundManager.configuratorElement.remove();
			}
			
			if (!this.sceneButtons.some(bb => bb.selected))
				this.setSceneConfigurator(null);
		}
		
		/** */
		private setTitleText(idx: number, text: string)
		{
			const titleDatas = this.titleView.getTitleData();
			const titleData = titleDatas[idx];
			titleData.text = text;
			
			const tb = this.titleView.getTextBox(idx);
			if (tb)
				tb.html = text;
			
			this.record.titles = titleDatas;
		}
		
		/** */
		private setDescriptionText(text: string)
		{
			this.record.description = text;
			this.descriptionView.html = text;
		}
		
		/** */
		private renderSizeConfigurator()
		{
			type TPickable = 
				HTMLImageElement |
				ITitle |
				CaptionedDescriptionView;
			
			const picker = this.sizePicker = new ElementPicker(this.sceneContainer);
			const pickMap = new Map<HTMLElement, TPickable>();
			
			picker.setRemovedFn(() =>
			{
				this.sizeButton.selected = false;
				this.handleSelectionChange();
			});
			
			if (this.contentImage)
			{
				picker.registerElement(this.contentImage);
				pickMap.set(this.contentImage, this.contentImage);
			}
			
			const titleTextBoxes = this.titleView.getTextBoxes();
			const titleDatas = this.titleView.getTitleData();
			
			for (let i = -1; ++i < titleDatas.length;)
			{
				const e = titleTextBoxes[i].editableElement;
				picker.registerElement(e);
				pickMap.set(e, titleDatas[i]);
			}
			
			if (this.descriptionView.html)
			{
				const e = this.descriptionView.root;
				picker.registerElement(e);
				pickMap.set(e, this.descriptionView);
			}
			
			const slider = new Slider();
			this.setSceneConfigurator(slider.root);
			
			const updatePick = () =>
			{
				if (!picker.pickedElement)
					return;
				
				const pickable = pickMap.get(picker.pickedElement);
				if (!pickable)
					return;
				
				if (pickable instanceof HTMLImageElement)
				{
					slider.progress = this.record.contentImageWidth;
				}
				else if (pickable instanceof CaptionedDescriptionView)
				{
					slider.progress = this.record.descriptionSize;
					slider.max = 10;
				}
				else
				{
					const idx = titleDatas.indexOf(pickable);
					if (idx < 0)
						return;
					
					const titleData = titleDatas[idx];
					slider.max = 50;
					slider.progress = titleData.size;
				}
			};
			
			picker.setPickChangedFn(updatePick);
			updatePick();
			
			slider.setProgressChangeFn(() =>
			{
				if (!picker.pickedElement)
					return;
				
				const pickable = pickMap.get(picker.pickedElement);
				if (!pickable)
					return;
				
				if (pickable instanceof HTMLImageElement)
				{
					this.setContentImageSize(slider.progress);
				}
				else if (pickable instanceof CaptionedDescriptionView)
				{
					this.setDescriptionSize(slider.progress);
				}
				else
				{
					const idx = titleDatas.indexOf(pickable);
					if (idx >= 0)
						this.setTitleSize(idx, slider.progress);
				}
			});
		}
		
		/** */
		private setContentImageSize(size: number)
		{
			if (this.contentImage)
				this.contentImage.style.width = UI.vsize(size);
			
			this.record.contentImageWidth = size;
		}
		
		/** */
		private setTitleSize(titleIdx: number, size: number)
		{
			const titleDatas = this.titleView.getTitleData();
			const titleData = titleDatas[titleIdx];
			titleData.size = size;
			this.titleView.setFontSize(titleIdx, size);
			this.record.titles = titleDatas;
		}
		
		/** */
		private setDescriptionSize(size: number)
		{
			this.descriptionView.fontSize = size;
			this.record.descriptionSize = size;
		}
		
		/** */
		private renderWeightConfigurator()
		{
			const picker = this.weightPicker = new ElementPicker(this.sceneContainer);
			const pickMap = new Map<HTMLElement, ITitle>();
			
			picker.setRemovedFn(() =>
			{
				this.weightButton.selected = false;
				this.handleSelectionChange();
			});
			
			const titleTextBoxes = this.titleView.getTextBoxes();
			const titleDatas = this.titleView.getTitleData();
			
			for (let i = -1; ++i < titleDatas.length;)
			{
				const e = titleTextBoxes[i].editableElement;
				picker.registerElement(e);
				pickMap.set(e, titleDatas[i]);
			}
			
			const slider = new Slider();
			this.setSceneConfigurator(slider.root);
			
			const updatePick = () =>
			{
				if (!picker.pickedElement)
					return;
				
				const pickable = pickMap.get(picker.pickedElement);
				if (!pickable)
					return;
				
				const idx = titleDatas.indexOf(pickable);
				if (idx < 0)
					return;
				
				const titleData = titleDatas[idx];
				slider.max = 900;
				slider.progress = titleData.weight;
			};
			
			picker.setPickChangedFn(updatePick);
			updatePick();
			
			slider.setProgressChangeFn(() =>
			{
				if (!picker.pickedElement)
					return;
				
				const pickedTitle = pickMap.get(picker.pickedElement);
				if (!pickedTitle)
					return;
				
				const idx = titleDatas.indexOf(pickedTitle);
				if (idx < 0)
					return;
				
				this.setTitleWeight(idx, slider.progress);
			});
		}
		
		/** */
		private setTitleWeight(titleIdx: number, weight: number)
		{
			const titleDatas = this.titleView.getTitleData();
			weight = Math.round(weight);
			const titleData = titleDatas[titleIdx];
			titleData.weight = weight;
			this.titleView.setFontWeight(titleIdx, weight);
			this.record.titles = titleDatas;
		}
		
		/** */
		private renderContrastConfigurator()
		{
			const slider = new Slider();
			slider.max = 100;
			slider.progress = this.record.textContrast;
			this.setSceneConfigurator(slider.root);
			slider.setProgressChangeFn(() => this.setContrast(slider.progress));
		}
		
		/** */
		private setContrast(amount: number)
		{
			RenderUtil.setContrast(this.textContainer, amount);
			this.record.textContrast = amount;
		}
		
		/** */
		private renderOriginConfigurator()
		{
			this.originPicker = new OriginPicker({
				...UI.backdropBlur(5),
				backgroundColor: UI.black(0.333),
			});
			
			this.originPicker.setSelectedFn(origin => this.setOrigin(origin));
			this.sceneContainer.append(this.originPicker.root);
		}
		
		/** */
		private setOrigin(origin: Origin | null)
		{
			if (origin !== null)
			{
				this.record.origin = origin;
				UI.toggleEnumClass(this.foregroundContainer, Origin, origin);
			}
			
			this.originButton.selected = false;
			this.handleSelectionChange();
		}
	}
}
