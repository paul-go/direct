
/**
 * 
 */
namespace Controller
{
	/** */
	export interface IController
	{
		readonly root: Element;
	}
	
	/** */
	type Constructor<T = any> = 
		(abstract new (...args: any) => T) | 
		(new (...args: any) => T);
	
	/**
	 * Returns the Controller of the specified Element,
	 * with the specified type.
	 * Returns null in the case when the controller is of a type other
	 * than the one specified.
	 * Note that elements can have multiple controllers, provided
	 * that they are of different types.
	 */
	export function get<T extends IController>(
		e: Element,
		type: Constructor<T>): T | null
	{
		let current: Element | null = e;
		
		for (;;)
		{
			const array = controllers.get(current);
			
			if (array)
				for (const obj of array)
					if (obj instanceof type)
						return obj;
			
			if (!(current.parentElement instanceof Element))
				break;
			
			current = current.parentElement;
		}
		
		return null;
	}
	
	/**
	 * Connects the specified object to the specified controller.
	 */
	export function set(controller: IController)
	{
		const array = controllers.get(controller.root) || [];
		array.push(controller);
		controllers.set(controller.root, array);
		(controller.root as any)._controller = controller;
		
		const ctorClassName = getConstructorClassName(controller);
		controller.root.classList.add(ctorClassName);
	}
	
	/**
	 * Scans upward through the DOM, starting at the specified Node, 
	 * looking for the first element whose controller matches the specified type.
	 */
	export function over<T extends IController>(
		via: Node | IController,
		type: Constructor<T>)
	{
		let current: Node | null = via instanceof Node ? via : via.root;
		
		while (current instanceof Node)
		{
			if (current instanceof Element)
			{
				const ctrl = Controller.get(current, type);
				if (ctrl)
					return ctrl;
			}
				
			current = current.parentElement;
		}
		
		throw new Error("Controller not found.");
	}
	
	/**
	 * Finds all descendent elements that have an attached controller of the
	 * specified type, that exist underneath the specified Node or controller,
	 * The specified function is executed against each controller, if it is provided.
	 * 
	 * @returns The first matching controller, or null if no matching controller
	 * was found.
	 */
	export function under<T extends IController>(
		via: Node | IController,
		type: Constructor<T>,
		execFn?: (controller: T) => void)
	{
		const e = 
			via instanceof Element ? via : 
			via instanceof Node ? via.parentElement :
			via.root;
		
		if (!e)
			throw "Cannot perform this method using the specified node.";
		
		const className = controllerClassNames.get(type);
		
		// If there is no class name found for the specified controller type,
		// this could possibly be an error (meaning that the controller type
		// wasn't registered). But it could also be a legitimate case of the
		// controller simply not having been registered at the time of this
		// function being called.
		if (!className)
			return;
		
		const descendents = e.getElementsByClassName(className);
		const controllers: T[] = [];
		
		for (let i = -1; ++i < descendents.length;)
		{
			const descendent = descendents[i];
			const ctrl = Controller.get(descendent, type);
			if (ctrl)
				controllers.push(ctrl);
		}
		
		if (execFn)
			for (const c of controllers)
				execFn(c);
		
		return controllers.length > 0 ? controllers[0] : null;
	}
	
	/**
	 * Returns an array of Controllers of the specified type,
	 * which are extracted from the specified array of elements.
	 */
	export function map<T extends IController>(elements: Element[], type: Constructor<T>): T[];
	export function map<T extends IController>(elementContainer: Element, type: Constructor<T>): T[];
	export function map<T extends IController>(e: Element | Element[], type: Constructor<T>): T[]
	{
		const elements = e instanceof Element ? window.Array.from(e.children) : e;
		return elements
			.map(e => get(e, type))
			.filter((o): o is T => o instanceof type);
	}
	
	/**
	 * Returns the element succeeding the specified element in the DOM
	 * that is connected to a controller of the specified type.
	 */
	export function next<T extends IController>(e: Element, type: Constructor<T>): T | null
	{
		for (;;)
		{
			e = e.nextElementSibling as Element;
			if (!(e instanceof Element))
				return null;
			
			const controller = get(e, type);
			if (controller)
				return controller;
		}
	}
	
	/**
	 * Returns the element preceeding the specified element in the DOM
	 * that is connected to a controller of the specified type.
	 */
	export function previous<T extends IController>(e: Element, type: Constructor<T>): T | null
	{
		for (;;)
		{
			e = e.previousElementSibling as Element;
			if (!(e instanceof Element))
				return null;
			
			const controller = get(e, type);
			if (controller)
				return controller;
		}
	}
	
	/** */
	function childrenOf<T extends IController>(e: Element, controllerType?: Constructor<T>)
	{
		let children = globalThis.Array.from(e.children);
		
		if (controllerType)
			children = children.filter(e => Controller.get(e, controllerType));
		
		return children;
	}
	
	/**
	 * Returns a unique CSS class name that corresponds to the type
	 * of the controller. This is used for querying via the .under() function.
	 */
	function getConstructorClassName(controller: IController)
	{
		const ctor = controller.constructor;
		let className = controllerClassNames.get(ctor);
		if (!className)
		{
			className = "__ctrl_" + (++nameIdx) + "__";
			controllerClassNames.set(ctor, className);
		}
		
		return className;
	}
	
	let nameIdx = 0;
	const controllerClassNames = new WeakMap<Function, string>();
	const controllers = new WeakMap<Element, object[]>();
	
	/**
	 * 
	 */
	export class Array<TController extends IController = IController>
	{
		/** */
		constructor(
			private readonly parentElement: Element,
			private readonly controllerType: Constructor<TController>)
		{
			this.marker = document.createComment("");
			parentElement.append(this.marker);
		}
		
		private readonly marker: Comment;
		
		/** */
		* [Symbol.iterator]()
		{
			for (let i = -1; ++i < this.parentElement.children.length;)
			{
				const child = this.parentElement.children.item(i);
				if (child)
				{
					const ctrl = Controller.get(child, this.controllerType);
					if (ctrl)
						yield ctrl;
				}
			}
		}
		
		/** */
		toArray()
		{
			const controllers = childrenOf(this.parentElement, this.controllerType);
			return Controller.map(controllers, this.controllerType);
		}
		
		/** */
		at(index: number)
		{
			return this.toArray().at(index) || null;
		}
		
		/** */
		insert(...controllers: TController[]): number;
		insert(index: number, ...controllers: TController[]): number;
		insert(a: number | TController, ...newControllers: TController[])
		{
			const index = typeof a === "number" ? (a || 0) : -1;
			const existingControllers = this.toArray();
			
			if (typeof a === "object")
				newControllers.unshift(a);
			
			if (newControllers.length === 0)
				return;
			
			if (existingControllers.length === 0)
			{
				this.parentElement.prepend(...newControllers.map(c => c.root));
			}
			else
			{
				const target = index >= existingControllers.length ? 
					(existingControllers.at(index) as IController).root :
					this.marker;
				
				for (const controller of newControllers)
					this.parentElement.insertBefore(controller.root, target);
			}
			
			return index < 0 ? existingControllers.length + newControllers.length : index;
		}
		
		/** */
		move(fromIndex: number, toIndex: number)
		{
			const children = childrenOf(this.parentElement, this.controllerType);
			const target = children.at(toIndex);
			const source = children.at(fromIndex);
			
			if (source && target)
				target.insertAdjacentElement("beforebegin", source);
		}
		
		/** */
		indexOf(controller: TController)
		{
			const children = childrenOf(this.parentElement, this.controllerType);
			for (let i = -1; ++i < children.length;)
				if (children[i] === controller.root)
					return i;
			
			return -1;
		}
		
		/** */
		get length()
		{
			return childrenOf(this.parentElement, this.controllerType).length;
		}
		
		/** */
		observe(callback: (mut: MutationRecord) => void)
		{
			if (this.observers.length === 0)
			{
				const mo = new MutationObserver(mutations =>
				{
					for (const mut of mutations)
						for (const fn of this.observers)
							fn(mut);
				});
				
				mo.observe(this.parentElement, { childList: true });
			}
			
			this.observers.push(callback);
		}
		
		private readonly observers: ((mut: MutationRecord) => void)[] = [];
		
		/** */
		private toJSON()
		{
			return this.toArray();
		}
	}
}
