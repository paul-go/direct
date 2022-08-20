
namespace App
{
	/** */
	export class LoadingModal
	{
		/** */
		constructor(container: HTMLElement)
		{
			this.root = Hot.div(
				"loading-modal",
				UI.anchor(),
				UI.flexCenter,
				{
					borderRadius: "inherit",
					transitionDuration: "0.75s",
					zIndex: "999",
					
					// It's necessary to have a background color, 
					// otherwise the blur won't render (at least in webkit)
					backgroundColor: "rgba(0, 0, 0, 0.01)", 
				},
				When.rendered(() => this.show()),
				
				UI.spinner("white", {
					width: "100px",
					height: "100px",
				})
			);
			
			this.hide();
			container.append(this.root);
		}
		
		readonly root;
		
		/** */
		private hide()
		{
			Hot.get(this.root)(
				{
					opacity: "0",
					// It's necessary to have a background color, 
					// otherwise the blur won't render (at least in webkit)
					backgroundColor: "rgba(0, 0, 0, 0.01)", 
				},
				UI.backdropBlur(0),
			);
		}
		
		/** */
		private show()
		{
			Hot.get(this.root)(
				UI.backdropBlur(7),
				{ opacity: "1" }
			);
		}
		
		/** */
		async terminate()
		{
			this.hide();
			await UI.waitTransitionEnd(this.root);
			this.root.remove();
		}
	}
}
