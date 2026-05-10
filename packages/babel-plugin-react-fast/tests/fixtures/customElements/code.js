const template = (
  <my-element some-attr={name} notProp={data} />
);

const template2 = (
  <my-element
    some-attr={state.name}
    notProp={state.data}
  />
);

const template3 = (
  <my-element>
    <header slot="head">Title</header>
  </my-element>
);

const template4 = (
  <>
    <slot name="head"></slot>
  </>
);

const template5 = (
  <x-dialog open={isOpen} onClose={handleClose}>
    <h2 slot="title">{title}</h2>
    <div slot="content">
      <p>{description}</p>
      <x-button variant="primary" onClick={handleConfirm}>Confirm</x-button>
      <x-button variant="secondary" onClick={handleClose}>Cancel</x-button>
    </div>
  </x-dialog>
);

const template6 = (
  <custom-tabs selected-index={activeTab} onTabChange={setActiveTab}>
    <custom-tab label="First">{content1}</custom-tab>
    <custom-tab label="Second">{content2}</custom-tab>
    <custom-tab label="Third">{content3}</custom-tab>
  </custom-tabs>
);
