// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC721Enumerable, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ERC20Recover} from "./infrastructures/ERC20Recover.sol";

contract SBT is
    ERC721Enumerable,
    EIP712,
    ERC20Recover,
    Pausable,
    ReentrancyGuard
{
    using Strings for uint256;

    struct Event {
        string name;
        string description;
        string place;
        string imageUrl;
        string category;
        uint256 startDate;
        uint256 endDate;
        uint256 claimStartDate;
        uint256 claimEndDate;
        uint256 maxAttendees;
    }

    mapping(address => bool) public allowlistedControllerAddresses;
    mapping(address => mapping(string => bool)) public mintedUsersByEvent;
    mapping(string => uint256) public numEventAttendees;

    mapping(string => Event) private events;
    mapping(string => bool) private eventState;
    string private _baseTokenURI;
    string private _contractURI;
    uint256 private _totalMintedTokens;

    // signature related
    mapping(address => uint256) public signerNonces;

    string private constant SIGNING_DOMAIN = "SBT";
    string private constant SIGNATURE_VERSION = "1";

    bytes32 private constant _CREATE_EVENT_REQUEST_TYPEHASH =
        keccak256(
            "CreateEventRequest(string eventId,string name,string description,string place,string imageUrl,string category,uint256 startDate,uint256 endDate,uint256 claimStartDate,uint256 claimEndDate,uint256 maxAttendees,uint256 nonce,uint256 deadline)"
        );
    bytes32 private constant _MINT_POAP_REQUEST_TYPEHASH =
        keccak256(
            "MintPOAPRequest(string eventId,string role,uint256 expiration,uint256 nonce,uint256 deadline)"
        );

    constructor(
        address controllerAddress_,
        string memory baseTokenURI_,
        string memory contractURI_
    )
        EIP712(SIGNING_DOMAIN, SIGNATURE_VERSION)
        ERC721("SBT", "CERT")
        ERC20Recover(_msgSender())
    {
        allowlistedControllerAddresses[controllerAddress_] = true;
        _baseTokenURI = baseTokenURI_;
        _contractURI = contractURI_;
    }

    event LogCreateEvent(
        address indexed signer,
        string eventId,
        uint256 timestamp
    );
    event LogEditEvent(
        address indexed signer,
        string eventId,
        uint256 timestamp
    );
    event LogMintPOAP(
        address indexed signer,
        string eventId,
        string role,
        uint256 defaultExpiration,
        uint256 tokenId,
        uint256 timestamp
    );

    error DeadlineExpired();
    error EventNotFound();
    error EventAlreadyExists();
    error MaxEventAttendeesReached();
    error NonExistentToken();
    error NonTransferrableToken();
    error UnauthorizedAccess();
    error UserAlreadyMinted();
    error WithdrawalFailed();

    /// WRITE FUNCTIONS

    function createEvent(
        address _signer,
        string calldata _eventId,
        Event calldata _event,
        uint256 _deadline,
        bytes calldata _signature
    ) external whenNotPaused nonReentrant {
        if (!allowlistedControllerAddresses[_msgSender()])
            revert UnauthorizedAccess();
        // slither-disable-next-line timestamp
        if (block.timestamp >= _deadline) revert DeadlineExpired();
        if (eventState[_eventId]) revert EventAlreadyExists();

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _CREATE_EVENT_REQUEST_TYPEHASH,
                    keccak256(abi.encodePacked(_eventId)),
                    keccak256(abi.encodePacked(_event.name)),
                    keccak256(abi.encodePacked(_event.description)),
                    keccak256(abi.encodePacked(_event.place)),
                    keccak256(abi.encodePacked(_event.imageUrl)),
                    keccak256(abi.encodePacked(_event.category)),
                    _event.startDate,
                    _event.endDate,
                    _event.claimStartDate,
                    _event.claimEndDate,
                    _event.maxAttendees,
                    signerNonces[_signer],
                    _deadline
                )
            )
        );

        address recoveredSigner = ECDSA.recover(digest, _signature);
        if (recoveredSigner != _signer) revert UnauthorizedAccess();
        // increment nonce so it can't be reused anymore even if deadline is not reached
        signerNonces[_signer]++;

        // create event
        events[_eventId] = _event;
        eventState[_eventId] = true;
        emit LogCreateEvent(_signer, _eventId, block.timestamp);
    }

    function mintPOAP(
        address _signer,
        string calldata _eventId,
        string calldata _role,
        uint256 _expiration,
        uint256 _deadline,
        bytes calldata _signature
    ) external whenNotPaused nonReentrant {
        if (!allowlistedControllerAddresses[_msgSender()])
            revert UnauthorizedAccess();
        // slither-disable-next-line timestamp
        if (block.timestamp >= _deadline) revert DeadlineExpired();
        if (!eventState[_eventId]) revert EventNotFound();
        if (numEventAttendees[_eventId] + 1 > events[_eventId].maxAttendees)
            revert MaxEventAttendeesReached();
        if (mintedUsersByEvent[_signer][_eventId]) revert UserAlreadyMinted();

        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _MINT_POAP_REQUEST_TYPEHASH,
                    keccak256(abi.encodePacked(_eventId)),
                    keccak256(abi.encodePacked(_role)),
                    _expiration,
                    signerNonces[_signer],
                    _deadline
                )
            )
        );

        address recoveredSigner = ECDSA.recover(digest, _signature);
        if (recoveredSigner != _signer) revert UnauthorizedAccess();
        // increment nonce so it can't be reused anymore even if deadline is not reached
        signerNonces[_signer]++;

        // mint POAP
        _totalMintedTokens++;
        mintedUsersByEvent[_signer][_eventId] = true;
        numEventAttendees[_eventId]++;
        _safeMint(_signer, _totalMintedTokens);

        emit LogMintPOAP(
            _signer,
            _eventId,
            _role,
            _expiration,
            _totalMintedTokens,
            block.timestamp
        );
    }
    
    /// RESTRICTED FUNCTIONS

    function reclaimERC20(IERC20 _token) external onlyOwner {
        uint256 balance = _token.balanceOf(address(this));
        if (!_token.transfer(_msgSender(), balance)) revert WithdrawalFailed();
    }

    function setBaseURI(string calldata _uri) external onlyOwner {
        _baseTokenURI = _uri;
    }

    function setContractURI(string calldata _uri) external onlyOwner {
        _contractURI = _uri;
    }

    function setControllerAddressAllowlist(
        address _controllerAddress,
        bool _state
    ) external onlyOwner {
        allowlistedControllerAddresses[_controllerAddress] = _state;
    }

    function setPaused(bool _setPaused) external onlyOwner {
        return (_setPaused) ? _pause() : _unpause();
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;

        // slither-disable-next-line arbitrary-send
        (bool success, ) = _msgSender().call{value: balance}("");
        if (!success) revert WithdrawalFailed();
    }

    /// READ FUNCTIONS

    function contractURI() external view returns (string memory) {
        return _contractURI;
    }

    function getEventInfo(
        string calldata _eventId
    ) external view returns (Event memory) {
        return events[_eventId];
    }

    function exists(uint256 _tokenId) public view returns (bool) {
        return ownerOf(_tokenId) != address(0);
    }

    function supportsInterface(
        bytes4 _interfaceId
    ) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    function tokenURI(
        uint256 _tokenId
    ) public view override(ERC721) returns (string memory) {
        if (ownerOf(_tokenId) == address(0)) revert NonExistentToken();
        return string(abi.encodePacked(_baseTokenURI, _tokenId.toString()));
    }

    function _update(
        address _to,
        uint256 _tokenId,
        address _auth
    ) internal override(ERC721Enumerable) whenNotPaused returns (address) {
        address from = super._update(_to, _tokenId, _auth);

        if (from != address(0)) revert NonTransferrableToken();
        return from;
    }
}
