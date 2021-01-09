// @flow
import { observer } from "mobx-react";
import { MoreIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState, MenuButton } from "reakit/Menu";
import Collection from "models/Collection";
import CollectionDelete from "scenes/CollectionDelete";
import CollectionEdit from "scenes/CollectionEdit";
import CollectionExport from "scenes/CollectionExport";
import CollectionMembers from "scenes/CollectionMembers";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import Modal from "components/Modal";
import NudeButton from "components/NudeButton";
import VisuallyHidden from "components/VisuallyHidden";
import useStores from "hooks/useStores";
import getDataTransferFiles from "utils/getDataTransferFiles";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {|
  collection: Collection,
|};

function CollectionMenu({ collection }: Props) {
  const menu = useMenuState();
  const { ui, documents, policies } = useStores();
  const { t } = useTranslation();
  const history = useHistory();

  const file = React.useRef<?HTMLInputElement>();
  const [showCollectionMembers, setShowCollectionMembers] = React.useState(
    false
  );
  const [showCollectionEdit, setShowCollectionEdit] = React.useState(false);
  const [showCollectionDelete, setShowCollectionDelete] = React.useState(false);
  const [showCollectionExport, setShowCollectionExport] = React.useState(false);

  const handleNewDocument = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      history.push(newDocumentUrl(collection.id));
    },
    [history, collection.id]
  );

  const handleImportDocument = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();

      // simulate a click on the file upload input element
      if (file.current) {
        file.current.click();
      }
    },
    [file]
  );

  const handleFilePicked = React.useCallback(
    async (ev: SyntheticEvent<>) => {
      const files = getDataTransferFiles(ev);

      try {
        const file = files[0];
        const document = await documents.import(
          file,
          null,
          this.props.collection.id,
          { publish: true }
        );
        history.push(document.url);
      } catch (err) {
        ui.showToast(err.message, {
          type: "error",
        });
      }
    },
    [history, ui, documents]
  );

  const can = policies.abilities(collection.id);

  return (
    <>
      <VisuallyHidden>
        <input
          type="file"
          ref={file}
          onChange={handleFilePicked}
          onClick={(ev) => ev.stopPropagation()}
          accept={documents.importFileTypes.join(", ")}
        />
      </VisuallyHidden>
      <MenuButton {...menu}>
        {(props) => (
          <NudeButton {...props}>
            <MoreIcon />
          </NudeButton>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Collection")}>
        <Template
          {...menu}
          items={[
            {
              title: t("New document"),
              visible: can.update,
              onClick: handleNewDocument,
            },
            {
              title: t("Import document"),
              visible: can.update,
              onClick: handleImportDocument,
            },
            {
              type: "separator",
            },
            {
              title: `${t("Edit")}…`,
              visible: can.update,
              onClick: () => setShowCollectionEdit(true),
            },
            {
              title: `${t("Permissions")}…`,
              visible: can.update,
              onClick: () => setShowCollectionMembers(true),
            },
            {
              title: `${t("Export")}…`,
              visible: !!(collection && can.export),
              onClick: () => setShowCollectionExport(true),
            },
            {
              type: "separator",
            },
            {
              type: "separator",
            },
            {
              title: `${t("Delete")}…`,
              visible: !!(collection && can.delete),
              onClick: () => setShowCollectionDelete(true),
            },
          ]}
        />
      </ContextMenu>
      <Modal
        title={t("Collection permissions")}
        onRequestClose={() => setShowCollectionMembers(false)}
        isOpen={showCollectionMembers}
      >
        <CollectionMembers
          collection={collection}
          onSubmit={() => setShowCollectionMembers(false)}
          onEdit={() => setShowCollectionEdit(true)}
        />
      </Modal>
      <Modal
        title={t("Edit collection")}
        isOpen={showCollectionEdit}
        onRequestClose={() => setShowCollectionEdit(false)}
      >
        <CollectionEdit
          onSubmit={() => setShowCollectionEdit(false)}
          collection={collection}
        />
      </Modal>
      <Modal
        title={t("Delete collection")}
        isOpen={showCollectionDelete}
        onRequestClose={() => setShowCollectionDelete(false)}
      >
        <CollectionDelete
          onSubmit={() => setShowCollectionDelete(false)}
          collection={collection}
        />
      </Modal>
      <Modal
        title={t("Export collection")}
        isOpen={showCollectionExport}
        onRequestClose={() => setShowCollectionExport(false)}
      >
        <CollectionExport
          onSubmit={() => setShowCollectionExport(false)}
          collection={collection}
        />
      </Modal>
    </>
  );
}

export default observer(CollectionMenu);
