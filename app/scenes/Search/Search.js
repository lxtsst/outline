// @flow
import * as React from 'react';
import ReactDOM from 'react-dom';
import keydown from 'react-keydown';
import Waypoint from 'react-waypoint';
import { withRouter } from 'react-router-dom';
import { observable, action } from 'mobx';
import { observer, inject } from 'mobx-react';
import { debounce } from 'lodash';
import queryString from 'query-string';
import styled from 'styled-components';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import { DEFAULT_PAGINATION_LIMIT } from 'stores/BaseStore';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import UsersStore from 'stores/UsersStore';
import { searchUrl } from 'utils/routeHelpers';
import { meta } from 'utils/keyboard';

import Flex from 'shared/components/Flex';
import Scrollable from 'components/Scrollable';
import Empty from 'components/Empty';
import Fade from 'components/Fade';
import Checkbox from 'components/Checkbox';
import Button from 'components/Button';

import HelpText from 'components/HelpText';
import CenteredContent from 'components/CenteredContent';
import LoadingIndicator from 'components/LoadingIndicator';
import DocumentPreview from 'components/DocumentPreview';
import PageTitle from 'components/PageTitle';
import SearchField from './components/SearchField';
import { DropdownMenu } from 'components/DropdownMenu';

type Props = {
  history: Object,
  match: Object,
  location: Object,
  documents: DocumentsStore,
  collections: CollectionsStore,
  users: UsersStore,
  notFound: ?boolean,
};

@observer
class Search extends React.Component<Props> {
  firstDocument: ?DocumentPreview;

  @observable query: string = '';
  @observable params: URLSearchParams = new URLSearchParams();
  @observable offset: number = 0;
  @observable allowLoadMore: boolean = true;
  @observable isFetching: boolean = false;
  @observable pinToTop: boolean = !!this.props.match.params.term;

  componentDidMount() {
    this.handleTermChange();
    this.handleQueryChange();
    this.props.users.fetchPage({ limit: 100 });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.location.search !== this.props.location.search) {
      this.handleQueryChange();
    }
    if (prevProps.match.params.term !== this.props.match.params.term) {
      this.handleTermChange();
    }
  }

  @keydown('esc')
  goBack() {
    this.props.history.goBack();
  }

  handleKeyDown = ev => {
    // Escape
    if (ev.which === 27) {
      ev.preventDefault();
      this.goBack();
    }

    // Down
    if (ev.which === 40) {
      ev.preventDefault();
      if (this.firstDocument) {
        const element = ReactDOM.findDOMNode(this.firstDocument);
        if (element instanceof HTMLElement) element.focus();
      }
    }
  };

  handleQueryChange = () => {
    this.params = new URLSearchParams(this.props.location.search);
    this.offset = 0;
    this.allowLoadMore = true;
    this.fetchResultsDebounced();
  };

  handleTermChange = () => {
    const query = this.props.match.params.term;
    this.query = query ? query : '';
    this.offset = 0;
    this.allowLoadMore = true;

    // To prevent "no results" showing before debounce kicks in
    this.isFetching = !!this.query;

    this.fetchResultsDebounced();
  };

  handleFilterChange = ev => {
    this.props.history.push({
      pathname: this.props.location.pathname,
      search: queryString.stringify({
        ...queryString.parse(this.props.location.search),
        includeArchived: ev.target.checked ? 'true' : undefined,
      }),
    });
  };

  handleCollectionChange = collectionId => {
    this.props.history.push({
      pathname: this.props.location.pathname,
      search: queryString.stringify({
        ...queryString.parse(this.props.location.search),
        collectionId,
      }),
    });
  };

  handleUserChange = userId => {
    this.props.history.push({
      pathname: this.props.location.pathname,
      search: queryString.stringify({
        ...queryString.parse(this.props.location.search),
        userId,
      }),
    });
  };

  get includeArchived() {
    return this.params.get('includeArchived') === 'true';
  }

  get collectionId() {
    const id = this.params.get('collectionId');
    return id ? id : undefined;
  }

  get userId() {
    const id = this.params.get('userId');
    return id ? id : undefined;
  }

  @action
  loadMoreResults = async () => {
    // Don't paginate if there aren't more results or we’re in the middle of fetching
    if (!this.allowLoadMore || this.isFetching) return;

    // Fetch more results
    await this.fetchResults();
  };

  @action
  fetchResults = async () => {
    if (this.query) {
      this.isFetching = true;

      try {
        const results = await this.props.documents.search(this.query, {
          offset: this.offset,
          limit: DEFAULT_PAGINATION_LIMIT,
          includeArchived: this.includeArchived,
          collectionId: this.collectionId,
          userId: this.userId,
        });

        if (results.length > 0) this.pinToTop = true;
        if (results.length === 0 || results.length < DEFAULT_PAGINATION_LIMIT) {
          this.allowLoadMore = false;
        } else {
          this.offset += DEFAULT_PAGINATION_LIMIT;
        }
      } finally {
        this.isFetching = false;
      }
    } else {
      this.pinToTop = false;
    }
  };

  fetchResultsDebounced = debounce(this.fetchResults, 350, {
    leading: false,
    trailing: true,
  });

  updateLocation = query => {
    this.props.history.replace(searchUrl(query));
  };

  setFirstDocumentRef = ref => {
    this.firstDocument = ref;
  };

  get title() {
    const query = this.query;
    const title = 'Search';
    if (query) return `${query} - ${title}`;
    return title;
  }

  render() {
    const { documents, notFound, location } = this.props;
    const results = documents.searchResults(this.query);
    const showEmpty = !this.isFetching && this.query && results.length === 0;
    const showShortcutTip =
      !this.pinToTop && location.state && location.state.fromMenu;

    const selectedCollection = this.props.collections.get(this.collectionId);
    const selectedUser = this.props.users.get(this.userId);

    return (
      <Container auto>
        <PageTitle title={this.title} />
        {this.isFetching && <LoadingIndicator />}
        {notFound && (
          <div>
            <h1>Not Found</h1>
            <Empty>We were unable to find the page you’re looking for.</Empty>
          </div>
        )}
        <ResultsWrapper pinToTop={this.pinToTop} column auto>
          <SearchField
            onKeyDown={this.handleKeyDown}
            onChange={this.updateLocation}
            defaultValue={this.query}
          />
          {showShortcutTip && (
            <Fade>
              <HelpText small>
                Use the <strong>{meta}+K</strong> shortcut to search from
                anywhere in Outline
              </HelpText>
            </Fade>
          )}
          {this.pinToTop && (
            <Filters>
              <Filter
                label={
                  this.includeArchived ? 'All documents' : 'Active documents'
                }
                active={this.includeArchived}
              >
                <Checkbox
                  label="Include archived"
                  name="includeArchived"
                  note="Include documents that have been previously been archived"
                  checked={this.includeArchived}
                  onChange={this.handleFilterChange}
                />
              </Filter>
              <Filter
                label={
                  this.collectionId
                    ? `Collection: ${
                        selectedCollection ? selectedCollection.name : ''
                      }`
                    : 'Any collection'
                }
                active={this.collectionId}
              >
                <List>
                  {this.props.collections.orderedData.map(collection => (
                    <li
                      key={collection.id}
                      onClick={ev => {
                        ev.preventDefault();
                        this.handleCollectionChange(
                          this.collectionId === collection.id
                            ? undefined
                            : collection.id
                        );
                      }}
                    >
                      <Label>
                        <input
                          type="checkbox"
                          checked={this.collectionId === collection.id}
                        />
                        &nbsp;
                        {collection.name}
                      </Label>
                    </li>
                  ))}
                </List>
              </Filter>
              <Filter
                label={
                  this.userId
                    ? `Author: ${selectedUser ? selectedUser.name : ''}`
                    : 'Any author'
                }
                active={this.userId}
              >
                <List>
                  {this.props.users.orderedData.map(user => (
                    <li
                      key={user.id}
                      onClick={ev => {
                        ev.preventDefault();
                        this.handleUserChange(
                          this.userId === user.id ? undefined : user.id
                        );
                      }}
                    >
                      <Label>
                        <input
                          type="checkbox"
                          checked={this.userId === user.id}
                        />
                        &nbsp;
                        {user.name}
                      </Label>
                    </li>
                  ))}
                </List>
              </Filter>
            </Filters>
          )}
          {showEmpty && <Empty>No matching documents.</Empty>}
          <ResultList column visible={this.pinToTop}>
            <StyledArrowKeyNavigation
              mode={ArrowKeyNavigation.mode.VERTICAL}
              defaultActiveChildIndex={0}
            >
              {results.map((result, index) => {
                const document = documents.data.get(result.document.id);
                if (!document) return null;

                return (
                  <DocumentPreview
                    ref={ref => index === 0 && this.setFirstDocumentRef(ref)}
                    key={document.id}
                    document={document}
                    highlight={this.query}
                    context={result.context}
                    showCollection
                  />
                );
              })}
            </StyledArrowKeyNavigation>
            {this.allowLoadMore && (
              <Waypoint key={this.offset} onEnter={this.loadMoreResults} />
            )}
          </ResultList>
        </ResultsWrapper>
      </Container>
    );
  }
}

const Container = styled(CenteredContent)`
  > div {
    position: relative;
    height: 100%;
  }
`;

const ResultsWrapper = styled(Flex)`
  position: absolute;
  transition: all 300ms cubic-bezier(0.65, 0.05, 0.36, 1);
  top: ${props => (props.pinToTop ? '0%' : '50%')};
  margin-top: ${props => (props.pinToTop ? '40px' : '-75px')};
  width: 100%;
`;

const ResultList = styled(Flex)`
  margin-bottom: 150px;
  opacity: ${props => (props.visible ? '1' : '0')};
  transition: all 400ms cubic-bezier(0.65, 0.05, 0.36, 1);
`;

const StyledArrowKeyNavigation = styled(ArrowKeyNavigation)`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const Filters = styled(Flex)`
  margin-bottom: 12px;
`;

const List = styled('ol')`
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
`;

const Label = styled('label')`
  font-weight: 500;
  font-size: 15px;
`;

const Content = styled(Flex)`
  padding: 12px 16px;
  width: 250px;
  max-height: 50vh;

  p {
    margin-bottom: 0;
  }
`;

const StyledButton = styled(Button)`
  box-shadow: none;
  text-transform: none;
  height: 28px;
`;

const SearchFilter = props => {
  return (
    <DropdownMenu
      className={props.className}
      label={
        <StyledButton
          active={props.active}
          neutral={!props.active}
          disclosure
          small
        >
          {props.label}
        </StyledButton>
      }
      leftAlign
    >
      {({ closePortal }) => (
        <Content column>
          <Scrollable>{props.children}</Scrollable>
          <Flex justify="flex-end">
            <Button onClick={closePortal} small neutral>
              Done
            </Button>
          </Flex>
        </Content>
      )}
    </DropdownMenu>
  );
};

const Filter = styled(SearchFilter)`
  margin-right: 8px;
`;

export default withRouter(inject('documents', 'collections', 'users')(Search));
