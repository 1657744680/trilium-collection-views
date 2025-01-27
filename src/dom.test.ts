import { screen } from "@testing-library/dom";
import {
	mockElementBoundingClientRect,
	mockResizeObserver,
} from "jsdom-testing-mocks";
import {
	appendChildren,
	fitToNoteDetailContainer,
	fixIncludedNote,
	renderError,
	staggeredRender,
} from "collection-views/dom";
import { clearBody, MockApi, MockNoteShort } from "collection-views/test";

describe("appendChildren", () => {
	afterEach(clearBody);

	test("appends elements and text to parent element", () => {
		const $div = document.createElement("div");
		appendChildren(document.body, [$div, document.createTextNode("text")]);
		expect(document.body).toContainElement($div);
		expect(document.body).toHaveTextContent("text");
	});
});

describe("renderError", () => {
	beforeEach(() => {
		new MockApi();
	});

	afterEach(clearBody);

	test("renders error message", () => {
		renderError("<strong>error</strong>");
		const $message = screen.getByText("error");
		expect($message.tagName).toBe("STRONG");
	});
});

describe("fitToNoteDetailContainer", () => {
	const observer = mockResizeObserver();
	let mockApi: MockApi;
	let $element: HTMLElement;

	beforeEach(() => {
		mockApi = new MockApi();
		$element = document.createElement("div");

		mockElementBoundingClientRect(mockApi.$component, {
			y: 100,
			height: 200,
		});
		mockElementBoundingClientRect($element, { y: 120, height: 160.5 });
	});

	afterEach(clearBody);

	test("resizes element when component is resized", () => {
		api.$container.append($element);
		fitToNoteDetailContainer($element);

		expect($element).toHaveStyle({ minHeight: "" });
		for (let i = 0; i < 2; i++) {
			observer.resize(mockApi.$component);
			expect($element).toHaveStyle({ height: "160px" });
		}
	});

	test("does not resize element if not in the DOM", () => {
		fitToNoteDetailContainer($element);
		observer.resize(mockApi.$component);
		expect($element).toHaveStyle({ height: "" });
	});
});

describe("fixIncludedNote", () => {
	const unwrappedHtml = `
		<h4 class="include-note-title">Title</h4>
		<div class="include-note-content type-render">
			<div class="rendered-note-content">
				<div></div>
			</div>
		</div>
	`;
	const wrappedHtml = `
		<div class="include-note-wrapper">
			${unwrappedHtml}
		</div>
	`;

	let mockApi: MockApi;
	let $include: HTMLElement;

	function createIncludedNote(html: string): void {
		$include.className = "include-note";
		$include.dataset.boxSize = "small";
		$include.innerHTML = html;
		$include
			.querySelector(".rendered-note-content > div")
			?.append(api.$container[0]);
	}

	beforeEach(() => {
		mockApi = new MockApi();
		$include = document.createElement("section");
	});

	test("does nothing if included note not found", () => {
		fixIncludedNote();
	});

	test("adds collection-view-include-note class", () => {
		createIncludedNote(wrappedHtml);
		fixIncludedNote();
		const $wrapper = $include.querySelector(".include-note-wrapper");
		expect($wrapper).toHaveClass("collection-view-include-note");
	});

	test("fixes missing box-size class", () => {
		createIncludedNote(wrappedHtml);
		fixIncludedNote();
		expect($include).toHaveClass("box-size-small");
	});

	test("fixes missing wrapper element", () => {
		createIncludedNote(unwrappedHtml);
		fixIncludedNote();
		expect($include.children).toHaveLength(1);

		const $wrapper = $include.children[0];
		expect($wrapper).toHaveClass(
			"include-note-wrapper",
			"collection-view-include-note"
		);
		expect($wrapper.children).toHaveLength(2);
		expect($wrapper.children[0]).toHaveClass("include-note-title");
		expect($wrapper.children[1]).toHaveClass("include-note-content");
	});

	test("does not create multiple wrappers", () => {
		createIncludedNote(wrappedHtml);
		fixIncludedNote();
		const $wrappers = $include.querySelectorAll(".include-note-wrapper");
		expect($wrappers).toHaveLength(1);
	});
});

describe("staggeredRender", () => {
	afterEach(clearBody);

	function getByTextRange(start: number, end: number): void {
		for (let i = start; i <= end; i++) {
			screen.getByText(`${i}`);
		}
	}

	test("appends elements to parent element", async () => {
		const notes: NoteShort[] = [];
		for (let i = 1; i <= 30; i++) {
			notes.push(new MockNoteShort({ title: `${i}` }));
		}

		await staggeredRender(document.body, 2, notes, async (note) => {
			const $p = document.createElement("p");
			$p.textContent = note.title;
			return $p;
		});

		getByTextRange(1, 2);
		await screen.findByText("3");
		getByTextRange(4, 27);
		await screen.findByText("28");
		getByTextRange(29, 30);
	});
});
