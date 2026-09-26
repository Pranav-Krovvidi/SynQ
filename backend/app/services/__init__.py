"""
app.services — re-exports CRUD service functions.
"""

from app.services.project import (  # noqa: F401
    create_project, delete_project, get_project, list_projects, update_project,
)
from app.services.service import (  # noqa: F401
    create_service, delete_service, get_service, list_services, update_service,
)
from app.services.adr import (  # noqa: F401
    create_adr, delete_adr, get_adr, list_adrs, update_adr,
)
from app.services.document import (  # noqa: F401
    delete_document, get_document, list_documents,
)
