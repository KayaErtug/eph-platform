\# Lina Portfolio Session



\## Amaç



Bu dosya Lina'nın portföy oluşturma sürecinde konuşma oturumunu nasıl takip edeceğini tanımlar.



Lina her mesajda süreci baştan başlatmaz.



Kullanıcının daha önce verdiği bilgileri hatırlar ve yalnızca eksik bilgiyi sorar.



\---



\## Ana State Alanları



Portföy oluşturma sırasında Lina aşağıdaki alanları takip eder:



\- mode

\- propertyType

\- transactionType

\- step

\- city

\- district

\- neighborhood

\- roomCount

\- squareMeter

\- floor

\- buildingFloorCount

\- price

\- confirmationStatus



\---



\## Daire Session State



Daire portföyü için zorunlu state alanları:



```json

{

&#x20; "mode": "PORTFOLIO\_CREATE",

&#x20; "propertyType": "DAIRE",

&#x20; "transactionType": "",

&#x20; "step": "TRANSACTION\_TYPE",

&#x20; "city": "",

&#x20; "district": "",

&#x20; "neighborhood": "",

&#x20; "roomCount": "",

&#x20; "squareMeter": "",

&#x20; "floor": "",

&#x20; "buildingFloorCount": "",

&#x20; "price": "",

&#x20; "confirmationStatus": "WAITING"

}

